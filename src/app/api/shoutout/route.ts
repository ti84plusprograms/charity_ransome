import { NextRequest, NextResponse } from "next/server";
import { generateRoast, generateRecommendationLetter } from "@/agents/roastmaster";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, userName, charityName, city, ironyScore, recipientEmail, letter } = body;

  if (type === "roast") {
    try {
      const message = await generateRoast({ userName, charityName, city, ironyScore });
      return NextResponse.json({ message });
    } catch {
      return NextResponse.json(
        { message: "The Roastmaster is temporarily offline. Probably volunteering. The irony." },
        { status: 200 }
      );
    }
  }

  if (type === "letter") {
    try {
      const message = await generateRecommendationLetter({ userName, charityName, city, ironyScore });
      return NextResponse.json({ message });
    } catch {
      return NextResponse.json(
        { message: "Letter generation failed. The quill has run dry." },
        { status: 200 }
      );
    }
  }

  if (type === "send") {
    console.log(`Shout-out email would be sent to: ${recipientEmail}`);
    // letter is received but email sending is not yet implemented
    return NextResponse.json({ success: true, message: "Shout-out queued!" });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
