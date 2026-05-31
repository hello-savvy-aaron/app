import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/eyebrow";
import { BlogStudio } from "@/components/admin/blog-studio";
import { listBlogPosts, isGithubConfigured } from "@/lib/blog-repo";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  // Admin-only: generates and publishes posts to the company website.
  await requireAdmin();
  const supabase = await createClient();

  // Resolve the active project from the cookie (validated against RLS scope).
  // Every blog is tied to a project, so this drives whether generation is
  // allowed at all.
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
  let activeProject: { id: string; name: string } | null = null;
  if (activeProjectId) {
    const { data } = await supabase
      .from("projects")
      .select("id,name")
      .eq("id", activeProjectId)
      .maybeSingle();
    activeProject = (data as { id: string; name: string } | null) ?? null;
  }

  // Best-effort: a GitHub hiccup shouldn't take down the generator.
  let posts: Awaited<ReturnType<typeof listBlogPosts>> = [];
  let postsError: string | null = null;
  try {
    posts = await listBlogPosts();
  } catch (e) {
    postsError = e instanceof Error ? e.message : "Could not load posts.";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Eyebrow className="mb-2">Content</Eyebrow>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Blog Studio</h1>
        <p className="text-sm text-ink-secondary">
          Generate a Haka Construction post, review it, and commit it to the site repo.
        </p>
      </div>

      <BlogStudio project={activeProject} />

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          Published posts
        </h2>

        {!isGithubConfigured() ? (
          <p className="text-sm text-ink-tertiary">
            GitHub isn&apos;t configured, so existing posts can&apos;t be listed.
          </p>
        ) : postsError ? (
          <p className="text-sm text-destructive">{postsError}</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-ink-tertiary">No posts in the repo yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {posts.map((post) => (
              <li key={post.path} className="flex items-center justify-between gap-4 px-4 py-3">
                <a
                  href={post.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium hover:underline"
                >
                  {post.title}
                </a>
                {post.date && (
                  <span className="shrink-0 text-xs text-ink-tertiary">{post.date}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
