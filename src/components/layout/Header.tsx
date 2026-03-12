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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-exl-blue">
              <span className="text-sm font-bold text-white font-heading">EXL</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold font-heading text-exl-blue">
                S&OP Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Agua de Madre</p>
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
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Analysis
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
