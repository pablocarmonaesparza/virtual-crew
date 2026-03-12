import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
