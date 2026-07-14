import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CompleteTaskResult } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await request.json()) as { taskId: string };
  if (!taskId) return NextResponse.json({ error: "No task id" }, { status: 400 });

  // The DB function handles ownership check, streak math, and badge awards
  const { data, error } = await supabase.rpc("complete_task", { p_task_id: taskId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data as CompleteTaskResult);
}