import Link from "next/link";
import { cn } from "@/lib/utils";

// Admin-only sub-navigation for a project: Overview (documents) and the
// Integrations tab. Rendered on both project pages; `active` is passed by each
// page so this stays a plain server component (no usePathname).
const TABS = [
  { key: "overview", label: "Overview", href: (id: string) => `/projects/${id}` },
  {
    key: "integrations",
    label: "Integrations",
    href: (id: string) => `/projects/${id}/integrations`,
  },
] as const;

export function ProjectTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: "overview" | "integrations";
}) {
  return (
    <nav className="-mb-px flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href(projectId)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-brand-primary text-brand-deep"
                : "border-transparent text-ink-secondary hover:text-brand-deep",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
