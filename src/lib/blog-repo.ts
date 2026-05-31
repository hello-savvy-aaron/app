import "server-only";

// GitHub read/write helpers for Blog Studio. Plain server-only module (not a
// "use server" action boundary) so it can be imported by both the server-side
// page (for listing) and the blog-actions server actions (for committing).
// Auth/admin gating lives in blog-actions.ts, which wraps these.

const {
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
  GITHUB_POSTS_DIR = "content/blog",
} = process.env;

export function isGithubConfigured(): boolean {
  return Boolean(GITHUB_TOKEN && GITHUB_REPO);
}

function ghHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "hellosavvy-blog-studio",
  };
}

function contentsUrl(path: string): string {
  return `https://api.github.com/repos/${GITHUB_REPO}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export type RepoPost = {
  name: string;
  path: string;
  htmlUrl: string;
  date: string | null;
  title: string;
};

// Filenames are <YYYY-MM-DD>-<slug>.md. Pull the date out and humanize the slug
// into a rough title for display (the real title lives in the file's front
// matter, but listing every file's contents would be a request per post).
function parsePost(file: { name: string; path: string; html_url: string }): RepoPost {
  const m = file.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  const date = m ? m[1] : null;
  const slug = m ? m[2] : file.name.replace(/\.md$/, "");
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: file.name, path: file.path, htmlUrl: file.html_url, date, title };
}

export async function listBlogPosts(): Promise<RepoPost[]> {
  if (!isGithubConfigured()) return [];

  const url = `${contentsUrl(GITHUB_POSTS_DIR)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
  const res = await fetch(url, { headers: ghHeaders(), cache: "no-store" });

  // The posts directory may not exist yet — that's not an error, just no posts.
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Could not list posts (GitHub ${res.status}).`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter((f) => f.type === "file" && f.name.endsWith(".md"))
    .map(parsePost)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function buildFrontMatter(meta: {
  title: string;
  date: string;
  description?: string;
  tags?: string[];
}): string {
  const lines = ["---", `title: "${meta.title.replace(/"/g, '\\"')}"`, `date: ${meta.date}`];
  if (meta.description) {
    lines.push(`description: "${meta.description.replace(/"/g, '\\"')}"`);
  }
  if (meta.tags && meta.tags.length > 0) {
    lines.push("tags:");
    for (const tag of meta.tags) lines.push(`  - "${tag.replace(/"/g, '\\"')}"`);
  }
  lines.push("draft: false", "---", "");
  return lines.join("\n");
}

export type CommitResult = {
  path: string;
  commitUrl?: string;
  fileUrl?: string;
};

export async function commitPost(input: {
  slug: string;
  title: string;
  description?: string;
  tags?: string[];
  markdown: string;
}): Promise<CommitResult> {
  if (!isGithubConfigured()) {
    throw new Error("GitHub is not configured on the server.");
  }

  const date = new Date().toISOString().slice(0, 10);
  const path = `${GITHUB_POSTS_DIR}/${date}-${input.slug}.md`;
  const fileBody =
    buildFrontMatter({ title: input.title || input.slug, date, description: input.description, tags: input.tags }) +
    input.markdown.trim() +
    "\n";

  const url = contentsUrl(path);

  // Guard against overwriting an existing file (same slug + date).
  const existing = await fetch(`${url}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: ghHeaders(),
    cache: "no-store",
  });
  if (existing.status === 200) {
    throw new Error("A post with this slug and date already exists.");
  }

  const commit = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `blog: add "${input.title || input.slug}"`,
      content: Buffer.from(fileBody, "utf8").toString("base64"),
      branch: GITHUB_BRANCH,
    }),
  });

  if (!commit.ok) {
    const detail = await commit.text();
    throw new Error(`GitHub commit failed: ${detail}`);
  }

  const data = await commit.json();
  return { path, commitUrl: data.commit?.html_url, fileUrl: data.content?.html_url };
}
