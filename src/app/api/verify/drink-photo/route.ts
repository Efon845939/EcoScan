import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const metaRaw = form.get("meta") as string | null;
    if (!file) return NextResponse.json({ ok: false, error: "file missing" }, { status: 400 });

    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    // This is where you would call a server-side helper to upload to a bucket
    // and queue for processing, e.g., via a Cloud Function trigger.
    // const r = await uploadAndQueue(file, { category: "drink_photo", ...meta });
    
    // For now, we'll just return a success response.
    return NextResponse.json({ ok: true, id: 'mock-id', path: `user-uploads/UID/${file.name}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
