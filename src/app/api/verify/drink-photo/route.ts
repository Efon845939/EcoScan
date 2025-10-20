export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const meta = JSON.parse(String(form.get("meta") || "{}"));
    if (!file) return NextResponse.json({ ok: false, error: "file missing" }, { status: 400 });

    // This is where you would call a server-side helper to upload to a bucket
    // and queue for processing, e.g., via a Cloud Function trigger.
    // const res = await uploadAndQueue(file, { category: "drink_photo", ...meta });
    
    return NextResponse.json({ ok: true, id: 'mock-id' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

    