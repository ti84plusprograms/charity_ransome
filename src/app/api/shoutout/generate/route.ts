import { NextRequest, NextResponse } from "next/server";
import { generateRoast, generateRecommendationLetter, generateExitEmailDraft } from "@/agents/roastmaster";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, userName, charityName, city, ironyScore } = body;

  if (type === "roast") {
    try {
      const message = await generateRoast({ userName, charityName, city, ironyScore });
      return NextResponse.json({ message });
    } catch {
      return NextResponse.json(
        { message: "The Roastmaster is temporarily offline. Probably volunteering. The irony." },
        { status: 200 },
      );
    }
  }

  if (type === "letter") {
    try {
      const message = await generateRecommendationLetter({ userName, charityName, city, ironyScore });
      return NextResponse.json({ message });
    } catch {
      return NextResponse.json({ message: "Letter generation failed. The quill has run dry." }, { status: 200 });
    }
  }

  if (type === "email") {
    try {
      const { contact, visitedCharityNames } = body;
      const message = await generateExitEmailDraft(userName, charityName, contact, visitedCharityNames);
      return NextResponse.json({ message });
    } catch {
      return NextResponse.json({ message: "Email generation failed." }, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
