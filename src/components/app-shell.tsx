"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
import { Eyebrow } from "@/components/eyebrow";
import { ProjectSwitcher } from "@/components/project-switcher";
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
};

// Clients navigate via the header project switcher; their docs live inside the
// project. The sidebar is admin-only: internal documents, users, blog studio.
const NAV_ADMIN: NavItem[] = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/users", label: "Users", icon: Users },
  { href: "/blog", label: "Blog Studio", icon: Newspaper },
];

type SidebarState = "full" | "icons";
const STORAGE_KEY = "hs-sidebar";

export function AppShell({
  email,
  subtitle,
  year,
  isAdmin,
  isImpersonating,
  projects,
  clientOptions,
  children,
}: {
  email: string;
  subtitle: string;
  year: number;
  isAdmin: boolean;
  isImpersonating: boolean;
  projects: { id: string; name: string }[];
  clientOptions: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<SidebarState>("full");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "full" || saved === "icons") {
      setState(saved);
    }
  }, []);
  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, state);
  }, [state, mounted]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // The minimizer lives in the sidebar header and toggles the rail full <-> icons.
  function toggleSidebar() {
    setState((s) => (s === "full" ? "icons" : "full"));
  }

  function signOut() {
    fetch("/auth/signout", { method: "POST" }).finally(() =>
      router.push("/login"),
    );
  }

  const icons = state === "icons";

  function SidebarInner({
    collapsed,
    showToggle,
  }: {
    collapsed: boolean;
    showToggle: boolean;
  }) {
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
              onClick={toggleSidebar}
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
              {subtitle}
            </Eyebrow>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 text-sm">
          {(isAdmin && !isImpersonating ? NAV_ADMIN : []).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
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
            className="shrink-0 rounded-[10px] outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Monogram />
          </Link>
          <div className="ml-1 border-l border-brand-primary/15 pl-2">
            <ProjectSwitcher
              projects={projects}
              isAdmin={isAdmin && !isImpersonating}
              clientOptions={clientOptions}
            />
          </div>
        </div>

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
      </header>

      <div className="flex flex-1">
        <aside
          className={cn(
            "app-sidebar hidden shrink-0 flex-col border-r border-sidebar-border pb-4 transition-[width] md:flex",
            icons ? "w-16" : "w-60",
          )}
        >
          <SidebarInner collapsed={icons} showToggle />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-ink-primary/30"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="app-sidebar absolute top-0 left-0 flex h-full w-60 flex-col border-r border-sidebar-border pb-4 shadow-lg">
              <SidebarInner collapsed={false} showToggle={false} />
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
