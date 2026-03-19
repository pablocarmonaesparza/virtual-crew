export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-card rounded-lg border border-border" />

      {/* Filter bar skeleton */}
      <div className="h-14 bg-card rounded-lg border border-border" />

      {/* KPI bar skeleton */}
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 bg-card rounded-lg border border-border" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="h-10 bg-card rounded-lg border border-border w-96" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-card rounded-lg border border-border" />
        <div className="h-96 bg-card rounded-lg border border-border" />
      </div>
    </div>
  );
}
