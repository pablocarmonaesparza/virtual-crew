// Semantic color palette for charts and data visualization
// Max 7 colors per viz, 80-90% neutral, 10-20% accent
export const CHART_COLORS = {
  brand: "#1a2b4a",
  brandLight: "rgba(26, 43, 74, 0.4)",
  brandMedium: "rgba(26, 43, 74, 0.65)",
  actual: "#16a34a",      // green - actual/positive
  negative: "#dc2626",     // red - negative/alerts
  warning: "#d97706",      // amber - caution/medium
  info: "#6366f1",         // indigo - informational
  neutral: "#94a3b8",      // slate - neutral/budget
  ambitious: "#8b5cf6",    // violet - ambitious target
} as const;
