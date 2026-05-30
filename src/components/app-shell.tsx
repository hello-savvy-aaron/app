"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  FolderKanban,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Settings,
  User,
} from "lucide-react";
import { Wordmark } from "@/components/wordmark";
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

// Sidebar nav. Add { href: "/documents", label: "Documents", icon: FileText }
// once the Documents portal ships.
const NAV: NavItem[] = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/documents", label: "Documents", icon: FileText },
];

type SidebarState = "full" | "icons" | "hidden";
const STORAGE_KEY = "hs-sidebar";

export function AppShell({
  email,
  subtitle,
  year,
  children,
}: {
  email: string;
  subtitle: string;
  year: number;
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
    if (saved === "full" || saved === "icons" || saved === "hidden") {
      setState(saved);
    }
  }, []);
  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, state);
  }, [state, mounted]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Header toggle cycles full -> icons -> hidden -> full.
  function cycle() {
    setState((s) => (s === "full" ? "icons" : s === "icons" ? "hidden" : "full"));
  }

  function signOut() {
    fetch("/auth/signout", { method: "POST" }).finally(() =>
      router.push("/login"),
    );
  }

  const icons = state === "icons";

  function SidebarInner({ collapsed }: { collapsed: boolean }) {
    return (
      <>
        <div
          className={cn(
            "flex h-14 items-center px-4",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <span className="text-lg font-bold tracking-[-0.02em]">
              <span className="text-display-lavender">H</span>
              <span className="text-display-magenta">S</span>
            </span>
          ) : (
            <div className="min-w-0">
              <Wordmark className="text-lg" />
              <p className="-mt-0.5 truncate text-[10px] font-medium tracking-[0.1em] text-ink-tertiary uppercase">
                {subtitle}
              </p>
            </div>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 text-sm">
          {NAV.map((item) => {
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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-canvas/90 px-4 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-2 text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <button
            onClick={cycle}
            className="hidden rounded-full p-2 text-ink-secondary transition-colors hover:bg-brand-primary-soft hover:text-brand-deep md:inline-flex"
            aria-label="Toggle sidebar"
            title={
              state === "full"
                ? "Collapse to icons"
                : state === "icons"
                  ? "Hide sidebar"
                  : "Show sidebar"
            }
          >
            {state === "hidden" ? (
              <PanelLeft className="size-5" />
            ) : (
              <PanelLeftClose className="size-5" />
            )}
          </button>
          <span className="md:hidden">
            <Wordmark className="text-base" />
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-9 items-center justify-center rounded-full bg-brand-primary-soft text-brand-deep outline-none transition-colors hover:bg-[#e2daf7] focus-visible:ring-3 focus-visible:ring-ring/40"
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
            "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar pb-4 transition-[width] md:flex",
            icons ? "w-16" : "w-60",
            state === "hidden" && "md:hidden",
          )}
        >
          <SidebarInner collapsed={icons} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-ink-primary/30"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute top-0 left-0 flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar pb-4 shadow-lg">
              <SidebarInner collapsed={false} />
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
