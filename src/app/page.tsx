import { redirect } from "next/navigation";

export default async function RootPage() {
  // Always go to dashboard — the middleware handles auth protection
  // If auth is not configured (demo mode), middleware lets through
  // If auth is configured and user is not logged in, middleware redirects to /login
  redirect("/dashboard");
}
