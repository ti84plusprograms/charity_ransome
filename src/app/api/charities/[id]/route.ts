import { NextResponse } from "next/server";
import { getMissionBriefById } from "@/lib/nonprofit-details";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const missionBrief = await getMissionBriefById(id);

  if (!missionBrief) {
    return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });
  }

  return NextResponse.json(missionBrief);
}
