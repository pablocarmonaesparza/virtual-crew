"use client";

import { cn } from "@/lib/utils/cn";
import { useDashboardStore } from "@/stores/dashboard-store";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useDashboardStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/30 transition-transform duration-200 ease-in-out",
          "bg-card",
          "lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isSidebarOpen ? "w-56" : "lg:w-16",
          "w-56"
        )}
      >
        {/* Logo + mobile close */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">EXL</span>
            </div>
            {isSidebarOpen && (
              <span className="font-semibold text-primary dark:text-foreground truncate">
                ADM S&OP
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isSidebarOpen && "lg:justify-center lg:px-0"
                )}
                title={!isSidebarOpen ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(
                  "truncate",
                  !isSidebarOpen && "lg:hidden"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-border/30 px-2 py-2">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              !isSidebarOpen && "lg:justify-center lg:px-0"
            )}
            title={!isSidebarOpen ? "Log out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", !isSidebarOpen && "lg:hidden")}>
              Log out
            </span>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <div className="hidden lg:block border-t border-border/30 p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
