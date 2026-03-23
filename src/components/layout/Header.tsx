"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Play, MessageCircle, RefreshCw, PanelLeft, Sun, Moon, Monitor } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function Header() {
  const { isRunning, setIsRunning, toggleChat, isChatOpen, setSidebarOpen, theme, toggleTheme, setLatestRecommendation, setActiveTab } =
    useDashboardStore();
  const { toast } = useToast();

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
        toast("Analysis complete");
      } else {
        toast("Analysis failed — using cached data", "error");
      }
    } catch {
      toast("Analysis failed — using cached data", "error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/30 bg-card">
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
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : theme === "dark"
                  ? "Switch to system theme"
                  : "Switch to light mode"
            }
          >
            {theme === "light" ? (
              <Sun className="h-4 w-4" />
            ) : theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </button>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
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
              isChatOpen ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
