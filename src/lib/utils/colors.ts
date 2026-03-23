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

export const DARK_CHART_COLORS = {
  brand: "#60a5fa",          // bright blue
  brandLight: "rgba(96, 165, 250, 0.5)",
  brandMedium: "rgba(96, 165, 250, 0.7)",
  actual: "#4ade80",         // bright green
  negative: "#f87171",       // bright red
  warning: "#fbbf24",        // bright amber
  info: "#818cf8",           // bright indigo
  neutral: "#94a3b8",        // slate
  ambitious: "#a78bfa",      // bright violet
} as const;

export interface ChartThemeColors {
  brand: string;
  brandLight: string;
  brandMedium: string;
  actual: string;
  negative: string;
  warning: string;
  info: string;
  neutral: string;
  ambitious: string;
  grid: string;
  axisTickFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export function getChartColors(isDark: boolean): ChartThemeColors {
  const palette = isDark ? DARK_CHART_COLORS : CHART_COLORS;
  return {
    ...palette,
    grid: isDark ? '#374151' : '#e5e7eb',
    axisTickFill: isDark ? '#9ca3af' : '#6b7280',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f1f5f9' : '#1e293b',
  };
}
