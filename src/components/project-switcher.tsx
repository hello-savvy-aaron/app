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

type ProjectOption = { id: string; name: string };
type ClientOption = { id: string; label: string };

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
  // On a project page the URL wins; elsewhere fall back to the persisted
  // active project (cookie) so the selection survives navigating to /blog etc.
  const match = pathname.match(/^\/projects\/([^/]+)/);
  const activeId = match?.[1] ?? activeProjectId;
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
              <Link href={`/projects/${p.id}`} className="justify-between">
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
