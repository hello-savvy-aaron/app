"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { commitPost, type CommitResult } from "@/lib/blog-repo";
import { resolveAnthropicKey, resolveGithub } from "@/lib/integrations/resolve";

// Blog Studio — generates Haka Construction blog posts with Claude, saves each
// to the blog_posts table (always tied to a project), and commits them as
// markdown to a GitHub repo. Admin-only; secrets stay server-side. Claude and
// GitHub credentials resolve per project (integration → global env var).

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

function parseTags(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Confirm the project is one the (admin) caller can see, and return its name
// for prompt context. Throws a legible error otherwise — this is the gate that
// makes "every blog must belong to a project" real on the server.
async function requireProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string | undefined,
): Promise<{ id: string; name: string }> {
  if (!projectId) throw new Error("Select a project before generating a blog.");
  const { data } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .maybeSingle();
  if (!data) throw new Error("That project no longer exists — pick another.");
  return data as { id: string; name: string };
}

export type BlogDraft = {
  id: string;
  title: string;
  slug: string;
  description: string;
  markdown: string;
};

// Actions return a result object rather than throwing for expected failures
// (no project, missing config, validation, known GitHub errors). Next.js masks
// thrown server-action error messages in production builds — returning keeps
// them legible to the admin. Truly unexpected errors are caught and returned.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function generateBlogDraft(input: {
  projectId: string;
  postId?: string;
  topic: string;
  keywords?: string;
  tags?: string;
  wordCount?: number;
}): Promise<ActionResult<BlogDraft>> {
  const profile = await requireAdmin();
  try {
    const supabase = await createClient();
    const project = await requireProject(supabase, input.projectId);

    const topic = input.topic?.trim();
    if (!topic) throw new Error("A topic is required.");
    const apiKey = await resolveAnthropicKey(supabase, project.id);
    if (!apiKey) throw new Error("Claude is not configured on the server.");

    const keywords = input.keywords?.trim() ?? "";
    const tags = input.tags?.trim() ?? "";
    const wordCount = input.wordCount && input.wordCount > 0 ? input.wordCount : 700;

    const anthropic = new Anthropic({ apiKey });
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
    markdown = markdown
      .replace(/^```(?:markdown)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : topic;
    const slug = slugify(title);
    const description = deriveDescription(markdown);

    const row = {
      project_id: project.id,
      title,
      slug,
      description,
      tags: parseTags(tags),
      markdown,
      status: "draft" as const,
      created_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    // Regenerate reuses the existing draft row; first generation inserts one.
    let id = input.postId;
    if (id) {
      const { error } = await supabase
        .from("blog_posts")
        .update(row)
        .eq("id", id)
        .eq("project_id", project.id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = data.id as string;
    }

    return { ok: true, data: { id, title, slug, description, markdown } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." };
  }
}

export async function publishBlogPost(input: {
  postId: string;
  projectId: string;
  slug: string;
  title: string;
  description?: string;
  tags?: string;
  markdown: string;
}): Promise<ActionResult<CommitResult>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const project = await requireProject(supabase, input.projectId);
    if (!input.postId) throw new Error("Generate a draft before committing.");

    const slug = slugify(input.slug || input.title);
    if (!slug) throw new Error("A title or slug is required.");
    if (!input.markdown?.trim()) throw new Error("The post body is empty.");

    const tags = parseTags(input.tags);
    const title = input.title?.trim() || slug;
    const description = input.description?.trim() || undefined;

    const github = await resolveGithub(supabase, project.id);
    const data = await commitPost(github, { slug, title, description, tags, markdown: input.markdown });

    // Persist the edited fields + publish state back to the row.
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title,
        slug,
        description: description ?? null,
        tags,
        markdown: input.markdown,
        status: "published",
        committed_path: data.path,
        commit_url: data.commitUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.postId)
      .eq("project_id", project.id);
    if (error) throw new Error(error.message);

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publish failed." };
  }
}
