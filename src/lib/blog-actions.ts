"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/auth";
import { commitPost, type CommitResult } from "@/lib/blog-repo";

// Blog Studio — generates Haka Construction blog posts with Claude and commits
// them as markdown to a GitHub repo. Both actions are admin-only; secrets stay
// server-side. GitHub read/write lives in blog-repo.ts.

const { ANTHROPIC_API_KEY } = process.env;

// Brand context for Haka, kept here so generation stays on-voice.
const HAKA_CONTEXT = `
You are writing blog content for Haka Construction, an outdoor and deck
construction company serving the Denver metro area (Englewood, Greenwood
Village, Centennial, and surrounding suburbs). The audience is local
homeowners considering decks, pergolas, outdoor living spaces, and related
projects. Voice: knowledgeable, trustworthy, approachable, locally rooted.
Avoid hype and fake urgency. Write for real homeowners, not for SEO bots,
but naturally include relevant local and service keywords.
`.trim();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// Derive a meta description from the first real paragraph of the post: skip the
// H1 and any headings/lists, strip inline markdown, and truncate on a word
// boundary near 155 chars.
function deriveDescription(markdown: string): string {
  const para = markdown
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !/^[-*>|]/.test(l) && !/^\d+\./.test(l));
  if (!para) return "";

  const plain = para
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links / images → text
    .replace(/[*_`]/g, "") // emphasis / code ticks
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= 160) return plain;
  return plain.slice(0, 155).replace(/\s+\S*$/, "") + "…";
}

export type BlogDraft = {
  title: string;
  slug: string;
  description: string;
  markdown: string;
};

export async function generateBlogDraft(input: {
  topic: string;
  keywords?: string;
  tags?: string;
  wordCount?: number;
}): Promise<BlogDraft> {
  await requireAdmin();

  const topic = input.topic?.trim();
  if (!topic) throw new Error("A topic is required.");
  if (!ANTHROPIC_API_KEY) throw new Error("Claude is not configured on the server.");

  const keywords = input.keywords?.trim() ?? "";
  const tags = input.tags?.trim() ?? "";
  const wordCount = input.wordCount && input.wordCount > 0 ? input.wordCount : 700;

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const userPrompt = `
Write a complete blog post.

Topic: ${topic}
${keywords ? `Keywords to work in naturally: ${keywords}` : ""}
${tags ? `Themes/tags this post belongs to: ${tags}` : ""}
Target length: about ${wordCount} words.

Output rules:
- Return ONLY GitHub-flavored Markdown, no commentary or code fences.
- Start with a single H1 line: "# <the post title>".
- Use H2/H3 subheadings, short paragraphs, and a bulleted list where useful.
- End with a brief call to action to contact Haka Construction for a quote.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: HAKA_CONTEXT,
    messages: [{ role: "user", content: userPrompt }],
  });

  let markdown = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Strip any stray code fences the model may have wrapped the post in.
  markdown = markdown
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : topic;

  return {
    title,
    slug: slugify(title),
    description: deriveDescription(markdown),
    markdown,
  };
}

function parseTags(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function publishBlogPost(input: {
  slug: string;
  title: string;
  description?: string;
  tags?: string;
  markdown: string;
}): Promise<CommitResult> {
  await requireAdmin();

  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("A title or slug is required.");
  if (!input.markdown?.trim()) throw new Error("The post body is empty.");

  return commitPost({
    slug,
    title: input.title?.trim() || slug,
    description: input.description?.trim() || undefined,
    tags: parseTags(input.tags),
    markdown: input.markdown,
  });
}
