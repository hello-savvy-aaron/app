"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CircleDot,
  FileText,
  LogOut,
  Menu,
  Newspaper,
  PanelLeft,
  PanelLeftClose,
  Settings,
  User,
  Users,
} from "lucide-react";
import { Monogram } from "@/components/monogram";
import { Wordmark } from "@/components/wordmark";
import { Eyebrow } from "@/components/eyebrow";
import { ProjectSwitcher } from "@/components/project-switcher";
import { BugReport } from "@/components/bug-report";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Match the route exactly rather than as a path prefix. Used for section
  // index pages (e.g. /settings) that share a prefix with their children.
  exact?: boolean;
};

// Clients navigate via the header project switcher; their docs live inside the
// project. The sidebar is admin-only: internal documents, blog studio, agents.
const NAV_ADMIN: NavItem[] = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/issues", label: "Issues", icon: CircleDot },
  { href: "/blog", label: "Blog Studio", icon: Newspaper },
  { href: "/agents", label: "Agents", icon: Bot },
];

// Settings has its own nav. Admins entering Settings (via the account menu)
// swap the main rail for this one; Users now lives here. "Back to app" returns
// to the main admin nav.
const NAV_SETTINGS: NavItem[] = [
  { href: "/settings", label: "Account", icon: User, exact: true },
  { href: "/settings/users", label: "Users", icon: Users },
];

const SETTINGS_PREFIX = "/settings";

function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

type SidebarState = "full" | "icons";
const STORAGE_KEY = "hs-sidebar";
// Same-tab notifier — the native `storage` event only fires in *other* tabs.
const SIDEBAR_EVENT = "hs-sidebar-change";

// localStorage-backed store for the rail's collapsed state, read through
// useSyncExternalStore so the persisted value hydrates without a setState-in-
// effect (server renders the "full" default, the client swaps in the saved one).
function readSidebarState(): SidebarState {
  if (typeof window === "undefined") return "full";
  return localStorage.getItem(STORAGE_KEY) === "icons" ? "icons" : "full";
}

function getServerSidebarState(): SidebarState {
  return "full";
}

function subscribeSidebar(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_EVENT, onChange);
  };
}

function writeSidebarState(next: SidebarState): void {
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

function SidebarInner({
  collapsed,
  showToggle,
  subtitle,
  isAdmin,
  isImpersonating,
  pathname,
  onToggle,
}: {
  collapsed: boolean;
  showToggle: boolean;
  subtitle: string;
  isAdmin: boolean;
  isImpersonating: boolean;
  pathname: string;
  onToggle: () => void;
}) {
  const adminNav = isAdmin && !isImpersonating;
  const inSettings =
    pathname === SETTINGS_PREFIX || pathname.startsWith(SETTINGS_PREFIX + "/");
  const settingsMode = adminNav && inSettings;
  // Settings swaps the rail; outside it, admins get the main nav.
  const items = adminNav ? (inSettings ? NAV_SETTINGS : NAV_ADMIN) : [];
  const sectionLabel = settingsMode ? "Settings" : subtitle;

  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center gap-2 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {showToggle ? (
          <button
            onClick={onToggle}
            className="rounded-full p-2 text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? (
              <PanelLeft className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>
        ) : (
          <Monogram className="size-7" />
        )}
        {!collapsed && (
          <Eyebrow className="px-2 py-0 text-[10px] tracking-[0.1em]">
            {sectionLabel}
          </Eyebrow>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2 text-sm">
        {settingsMode && (
          <Link
            href="/documents"
            title={collapsed ? "Back to app" : undefined}
            className={cn(
              "mb-1 flex items-center gap-3 rounded-full px-3 py-2 font-medium text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep",
              collapsed && "justify-center px-0",
            )}
          >
            <ArrowLeft className="size-4 shrink-0" />
            {!collapsed && <span>Back to app</span>}
          </Link>
        )}
        {items.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-brand-primary-soft text-brand-deep"
                  : "text-ink-secondary hover:bg-brand-primary-soft hover:text-brand-deep",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppShell({
  email,
  subtitle,
  year,
  isAdmin,
  isImpersonating,
  projects,
  activeProjectId,
  clientOptions,
  children,
}: {
  email: string;
  subtitle: string;
  year: number;
  isAdmin: boolean;
  isImpersonating: boolean;
  projects: { id: string; name: string }[];
  activeProjectId: string | null;
  clientOptions: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const state = useSyncExternalStore(
    subscribeSidebar,
    readSidebarState,
    getServerSidebarState,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes. Done during render via
  // the "store previous value" pattern rather than an effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // The minimizer lives in the sidebar header and toggles the rail full <-> icons.
  function toggleSidebar() {
    writeSidebarState(state === "full" ? "icons" : "full");
  }

  function signOut() {
    fetch("/auth/signout", { method: "POST" }).finally(() =>
      router.push("/login"),
    );
  }

  const icons = state === "icons";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="app-header sticky top-0 z-30 flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-2 text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Link
            href="/"
            aria-label="HelloSavvy home"
            className="shrink-0 rounded-md px-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Wordmark className="text-base sm:text-lg" />
          </Link>
          <div className="ml-1 border-l border-brand-primary/15 pl-2">
            <ProjectSwitcher
              projects={projects}
              activeProjectId={activeProjectId}
              isAdmin={isAdmin && !isImpersonating}
              clientOptions={clientOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <BugReport activeProjectId={activeProjectId} />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex size-9 items-center justify-center rounded-full bg-brand-primary-soft text-brand-deep ring-1 ring-inset ring-brand-primary/25 outline-none transition-colors hover:bg-[#e2daf7] hover:ring-brand-primary/40 focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Account menu"
            >
              <User className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate font-normal text-ink-secondary">
                {email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  signOut();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "app-sidebar hidden shrink-0 flex-col border-r border-sidebar-border pb-4 transition-[width] md:flex",
            icons ? "w-16" : "w-60",
          )}
        >
          <SidebarInner
            collapsed={icons}
            showToggle
            subtitle={subtitle}
            isAdmin={isAdmin}
            isImpersonating={isImpersonating}
            pathname={pathname}
            onToggle={toggleSidebar}
          />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-ink-primary/30"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="app-sidebar absolute top-0 left-0 flex h-full w-60 flex-col border-r border-sidebar-border pb-4 shadow-lg">
              <SidebarInner
                collapsed={false}
                showToggle={false}
                subtitle={subtitle}
                isAdmin={isAdmin}
                isImpersonating={isImpersonating}
                pathname={pathname}
                onToggle={toggleSidebar}
              />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 p-6 md:p-8">{children}</main>
          <footer className="border-t border-border px-6 py-4 text-xs text-ink-tertiary md:px-8">
            <div className="flex items-center justify-between">
              <span>© {year} HelloSavvy</span>
              <span>Workspace</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
