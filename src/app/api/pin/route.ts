import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  const pin = getSetting("pin");
  return NextResponse.json({ configured: !!pin, pinLength: pin ? pin.length : 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, pin } = body;

  if (action === "verify") {
    const stored = getSetting("pin") || "";
    return NextResponse.json({ valid: pin === stored });
  }

  if (action === "set") {
    if (!pin || pin.length < 4 || pin.length > 10) {
      return NextResponse.json({ error: "PIN must be 4-10 characters" }, { status: 400 });
    }
    setSetting("pin", pin);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
