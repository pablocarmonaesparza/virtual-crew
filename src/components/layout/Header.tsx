"use client";

import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Play, MessageCircle, RefreshCw } from "lucide-react";

export function Header() {
  const { isRunning, setIsRunning, toggleChat, isChatOpen } = useDashboardStore();

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-exl-blue">
              <span className="text-sm font-bold text-white font-heading">EXL</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold font-heading text-exl-blue truncate">
                S&OP Dashboard
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Agua de Madre</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="bg-exl-blue hover:bg-exl-blue-light"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin sm:mr-2" />
                <span className="hidden sm:inline">Running...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Run Analysis</span>
              </>
            )}
          </Button>
          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="icon"
            onClick={toggleChat}
            aria-label="Toggle chat"
            className={isChatOpen ? "bg-exl-blue hover:bg-exl-blue-light" : ""}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
