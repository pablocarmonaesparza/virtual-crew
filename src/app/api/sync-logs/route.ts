import { NextResponse } from "next/server";
import { getSyncLogsFromDB } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const logs = await getSyncLogsFromDB();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Sync logs API error:", error);
    return NextResponse.json({ logs: [] });
  }
}
