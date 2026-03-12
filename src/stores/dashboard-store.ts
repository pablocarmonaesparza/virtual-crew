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
}));
