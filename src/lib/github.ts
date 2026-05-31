// Server-side GitHub helpers. The PAT (GITHUB_TOKEN) is shared across the app
// and stays server-side; to file issues it must have "Issues: Read and write"
// on every repo linked to a project. Talks to the REST API directly (no SDK),
// the same approach as the Blog Studio publisher in blog-actions.ts.

const { GITHUB_TOKEN } = process.env;

export type GitHubRepo = { owner: string; repo: string };

/** Parse `owner/repo` from a GitHub remote URL (https or ssh) or a bare
 *  "owner/repo" string. Returns null when the input isn't a recognizable repo. */
export function parseGitHubRepo(
  input: string | null | undefined,
): GitHubRepo | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;

  // Normalize: drop a trailing ".git" and any trailing slashes.
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
  // git@github.com:owner/repo
  const ssh = s.match(/^git@github\.com:(.+)$/i);
  if (ssh) s = ssh[1];
  // https://github.com/owner/repo (with optional www.)
  const https = s.match(/^https?:\/\/(?:www\.)?github\.com\/(.+)$/i);
  if (https) s = https[1];

  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo) return null;
  return { owner, repo };
}

export type CreatedIssue = { number: number; htmlUrl: string };

/** Create a GitHub issue via the REST API. Throws with a readable message when
 *  the server isn't configured or GitHub rejects the request. */
export async function createGitHubIssue(
  { owner, repo }: GitHubRepo,
  { title, body }: { title: string; body?: string | null },
): Promise<CreatedIssue> {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub is not configured on the server.");
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "hellosavvy-app",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title, body: body || undefined }),
    },
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "GitHub repository not found, or the server token can't access it.",
      );
    }
    const detail = await res.text();
    throw new Error(`GitHub issue creation failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return { number: data.number as number, htmlUrl: data.html_url as string };
}
