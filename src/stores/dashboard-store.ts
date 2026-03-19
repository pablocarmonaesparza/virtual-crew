import { create } from "zustand";
import type { DashboardFilters, ChatMessage } from "@/types";

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
  theme: "light" | "dark";
  toggleTheme: () => void;
  shopifyConnected: boolean;
  setShopifyConnected: (connected: boolean) => void;
  shopifyStoreName: string;
  setShopifyStoreName: (name: string) => void;
  supabaseConnected: boolean;
  setSupabaseConnected: (connected: boolean) => void;
  dataSource: "mock" | "live" | "supabase";
  setDataSource: (source: "mock" | "live" | "supabase") => void;
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
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  theme:
    typeof window !== "undefined"
      ? ((localStorage.getItem("theme") as "light" | "dark") || "light")
      : "light",
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }
      return { theme: newTheme };
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
  dataSource: "mock",
  setDataSource: (source) => set({ dataSource: source }),
}));
