import { appendFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const LOG_PATH = join(process.cwd(), "debug-21ff00.log");

/** Dev debug ingest — appends NDJSON for the current debug session. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    appendFileSync(LOG_PATH, `${JSON.stringify(body)}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "log failed" },
      { status: 500 }
    );
  }
}
