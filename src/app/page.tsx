import { redirect } from "next/navigation";

export default async function RootPage() {
  // Skip Supabase auth check when env vars are not configured
  // This allows the app to work in demo/development mode
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/dashboard");
  }

  // When Supabase is configured, check auth
  const { createClient } = await import("@/lib/supabase/server");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch {
    redirect("/dashboard");
  }
}
