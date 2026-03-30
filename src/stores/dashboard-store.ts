import { create } from "zustand";
import type { DashboardFilters, ChatMessage, LLMRecommendation } from "@/types";

interface DashboardState {
  filters: DashboardFilters;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  isChatOpen: boolean;
  toggleChat: () => void;
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleTheme: () => void;
  shopifyConnected: boolean;
  setShopifyConnected: (connected: boolean) => void;
  shopifyStoreName: string;
  setShopifyStoreName: (name: string) => void;
  supabaseConnected: boolean;
  setSupabaseConnected: (connected: boolean) => void;
  metaConnected: boolean;
  setMetaConnected: (connected: boolean) => void;
  dataSource: "mock" | "live" | "supabase";
  setDataSource: (source: "mock" | "live" | "supabase") => void;
  latestRecommendation: LLMRecommendation | null;
  setLatestRecommendation: (rec: LLMRecommendation | null) => void;
}

const defaultFilters: DashboardFilters = {
  channel: "all",
  category: "all",
  customerType: "all",
  adsPlatform: "all",
  selectedMonth: "2026-03",
  timeRange: "6m",
};

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: defaultFilters }),
  isChatOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),
  isRunning: false,
  setIsRunning: (running) => set({ isRunning: running }),
  activeTab: "forecast",
  setActiveTab: (tab) => set({ activeTab: tab }),
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  theme:
    typeof window !== "undefined"
      ? ((localStorage.getItem("theme") as "light" | "dark" | "system") || "dark")
      : "dark",
  setTheme: (theme) =>
    set(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", theme);
        if (theme === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          document.documentElement.classList.toggle("dark", prefersDark);
        } else {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
      }
      return { theme };
    }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : state.theme === "dark" ? "system" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
        if (next === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          document.documentElement.classList.toggle("dark", prefersDark);
        } else {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      }
      return { theme: next };
    }),
  shopifyConnected: false,
  setShopifyConnected: (connected) =>
    set((state) => ({
      shopifyConnected: connected,
      // Only upgrade to "live" if we're not already on "supabase"
      dataSource: state.dataSource === "supabase" ? "supabase" : connected ? "live" : "mock",
    })),
  shopifyStoreName: "",
  setShopifyStoreName: (name) => set({ shopifyStoreName: name }),
  supabaseConnected: false,
  setSupabaseConnected: (connected) => set({ supabaseConnected: connected }),
  metaConnected: false,
  setMetaConnected: (connected) =>
    set((state) => ({
      metaConnected: connected,
      dataSource: connected && state.dataSource === "mock" ? "live" : state.dataSource,
    })),
  dataSource: "mock",
  setDataSource: (source) => set({ dataSource: source }),
  latestRecommendation: null,
  setLatestRecommendation: (rec) => set({ latestRecommendation: rec }),
}));
