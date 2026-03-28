import { NextRequest, NextResponse } from "next/server";
import { generateSentryAudit } from "@/agents/coach";
import { featuredNonProfits } from "@/lib/nonprofits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentCharity, visitedCharityIds, event, tabSwitchCount, emergencyContact, userName } = body;

    // Resolve visited charities from IDs
    const visitedCharities = featuredNonProfits.filter(c =>
      visitedCharityIds?.includes(c.id) && c.id !== currentCharity?.id
    );

    const message = await generateSentryAudit({
      currentCharity,
      visitedCharities,
      event,
      tabSwitchCount,
      emergencyContact: emergencyContact || "Anonymous Contact",
      userName: userName || undefined,
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Coach Shame API Error:", error);
    return NextResponse.json(
      { message: "SYSTEM_ERROR: Your betrayal crashed our servers. We're billing you for the downtime." },
      { status: 200 }
    );
  }
}
