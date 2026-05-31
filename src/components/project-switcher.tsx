"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, FolderKanban, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFormDialog } from "@/components/admin/project-form-dialog";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

type ProjectOption = { id: string; name: string };
type ClientOption = { id: string; label: string };

// The active project lives in the hs-project cookie. We read/write it on the
// client because the (app) layout is shared and doesn't re-render on soft
// navigation, so the server-passed activeProjectId prop goes stale as you move
// between pages.
function readActiveProject(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ACTIVE_PROJECT_COOKIE}=([^;]+)`),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function writeActiveProject(id: string) {
  document.cookie = `${ACTIVE_PROJECT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function ProjectSwitcher({
  projects,
  activeProjectId,
  isAdmin,
  clientOptions,
}: {
  projects: ProjectOption[];
  activeProjectId: string | null;
  isAdmin: boolean;
  clientOptions: ClientOption[];
}) {
  const pathname = usePathname();
  const [newOpen, setNewOpen] = useState(false);
  // On a project page the URL wins; elsewhere use the cookie, re-read on every
  // navigation (the layout prop is stale after soft nav). Seed from the prop so
  // SSR and the first client paint agree (no hydration mismatch).
  const [cookieId, setCookieId] = useState<string | null>(activeProjectId);
  // Re-read the cookie on navigation via the "store previous value" pattern
  // (during render, not an effect). SSR/first paint keep the prop seed above.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setCookieId(readActiveProject());
  }
  const urlId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const activeId = urlId ?? cookieId;
  const active = projects.find((p) => p.id === activeId);

  // Non-admins with no projects: nothing to switch between.
  if (!isAdmin && projects.length === 0) return null;

  const label = active?.name ?? (projects.length ? "Select a project" : "No projects");

  // A single-project client gets a plain, non-interactive label.
  if (!isAdmin && projects.length === 1) {
    return (
      <span className="flex items-center gap-2 px-2 text-sm font-medium text-ink-primary">
        <FolderKanban className="size-4 shrink-0 text-ink-tertiary" />
        <span className="max-w-[40vw] truncate sm:max-w-xs">{label}</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-primary outline-none transition-colors hover:bg-brand-primary-soft hover:text-brand-deep focus-visible:ring-3 focus-visible:ring-ring/40">
        <FolderKanban className="size-4 shrink-0 text-ink-tertiary" />
        <span className="max-w-[40vw] truncate sm:max-w-xs">{label}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {projects.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-ink-tertiary">No projects yet.</div>
        ) : (
          projects.map((p) => (
            <DropdownMenuItem key={p.id} asChild>
              <Link
                href={`/projects/${p.id}`}
                onClick={() => writeActiveProject(p.id)}
                className="justify-between"
              >
                <span className="truncate">{p.name}</span>
                {p.id === activeId && <Check className="size-4 shrink-0" />}
              </Link>
            </DropdownMenuItem>
          ))
        )}

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setNewOpen(true)}
              className="text-brand-deep"
            >
              <Plus className="size-4" />
              New project
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>

      {isAdmin && (
        <ProjectFormDialog
          clients={clientOptions}
          open={newOpen}
          onOpenChange={setNewOpen}
        />
      )}
    </DropdownMenu>
  );
}
