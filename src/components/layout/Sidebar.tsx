"use client";

import { cn } from "@/lib/utils/cn";
import { useDashboardStore } from "@/stores/dashboard-store";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Target,
  Package,
  BarChart3,
  Users,
  Lightbulb,
  BookOpen,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DASHBOARD_TABS = [
  { value: "forecast", label: "Forecast", icon: Target },
  { value: "sku", label: "SKU Detail", icon: Package },
  { value: "product-bible", label: "Product Bible", icon: BookOpen },
  { value: "ads", label: "Ad Spend", icon: BarChart3 },
  { value: "budget", label: "Budget Planning", icon: Wallet },
  { value: "cac", label: "CAC", icon: Users },
  { value: "recommendations", label: "Recommendations", icon: Lightbulb },
] as const;

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar, setSidebarOpen, activeTab, setActiveTab } = useDashboardStore();
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname === "/dashboard";
  const isSettings = pathname.startsWith("/dashboard/settings");
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
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {/* Dashboard tabs — flat list, no dropdown */}
          {DASHBOARD_TABS.map(({ value, label, icon: Icon }) => {
            const isActive = isDashboard && activeTab === value;
            return (
              <button
                key={value}
                onClick={() => {
                  setActiveTab(value);
                  if (!isDashboard) router.push("/dashboard");
                  const mq = window.matchMedia("(max-width: 1023px)");
                  if (mq.matches) setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isSidebarOpen && "lg:justify-center lg:px-0"
                )}
                title={!isSidebarOpen ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", !isSidebarOpen && "lg:hidden")}>
                  {label}
                </span>
              </button>
            );
          })}

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors mt-2",
              isSettings
                ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              !isSidebarOpen && "lg:justify-center lg:px-0"
            )}
            title={!isSidebarOpen ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", !isSidebarOpen && "lg:hidden")}>
              Settings
            </span>
          </Link>
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
