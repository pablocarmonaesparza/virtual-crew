"use client";

import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Play, MessageCircle, RefreshCw, PanelLeft, Sun, Moon } from "lucide-react";

export function Header() {
  const { isRunning, setIsRunning, toggleChat, isChatOpen, setSidebarOpen, theme, toggleTheme, setLatestRecommendation, setActiveTab } =
    useDashboardStore();

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { month: "2026-03", trigger: "manual_run" } }),
      });
      if (response.ok) {
        const result = await response.json();
        setLatestRecommendation(result);
        setActiveTab("recommendations");
      }
    } catch {
      // Silently fail — mock data will still be available in recommendations tab
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/30 bg-white dark:bg-card">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-base font-semibold font-heading text-foreground">
              S&OP Dashboard
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              Agua de Madre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            size="sm"
            className="bg-[#1a2b4a] hover:bg-[#2a4270] text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 h-8 text-xs"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Run Analysis
              </>
            )}
          </Button>
          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="icon"
            onClick={toggleChat}
            aria-label="Toggle chat"
            className={cn(
              "h-8 w-8",
              isChatOpen ? "bg-[#1a2b4a] hover:bg-[#2a4270] text-white dark:bg-primary dark:text-primary-foreground" : ""
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
