"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Send, X, Bot, User } from "lucide-react";
import type { ChatMessage } from "@/types";

export function ChatPanel() {
  const { isChatOpen, toggleChat, chatMessages, addChatMessage } = useDashboardStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  if (!isChatOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim(), history: chatMessages }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || "I can help you explore your S&OP data. Try asking about specific SKUs, forecast accuracy, ad spend, or customer metrics.",
        timestamp: new Date().toISOString(),
      };
      addChatMessage(assistantMessage);
    } catch {
      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm currently running with mock data. Once the Anthropic API key is configured, I'll be able to answer your questions about Agua de Madre's S&OP data in real-time. Try asking about forecast accuracy, SKU performance, ad spend, or customer metrics.",
        timestamp: new Date().toISOString(),
      };
      addChatMessage(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[600px] shadow-2xl flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-exl-blue">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="text-sm">S&OP Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleChat}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px]">
          {chatMessages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Ask me anything about your S&OP data
              </p>
              <div className="mt-3 space-y-1.5">
                {[
                  "What are the top 5 SKUs this month?",
                  "How is forecast accuracy trending?",
                  "Compare Amazon vs Shopify CAC",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="block w-full text-left text-xs text-exl-blue hover:bg-slate-50 rounded-md px-3 py-1.5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-exl-blue/10 mt-0.5">
                  <Bot className="h-3 w-3 text-exl-blue" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[280px] ${
                  msg.role === "user"
                    ? "bg-exl-blue text-white"
                    : "bg-slate-100 text-foreground"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 mt-0.5">
                  <User className="h-3 w-3 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-exl-blue/10 mt-0.5">
                <Bot className="h-3 w-3 text-exl-blue" />
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-exl-blue/30"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-exl-blue hover:bg-exl-blue-light shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
