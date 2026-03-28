import { NextResponse } from "next/server";
import { generateCampaignVideoOutput } from "@/lib/campaign-generator";
import { getMissionBriefById } from "@/lib/nonprofit-details";
import type { CampaignGenerationRequest } from "@/lib/campaign";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<CampaignGenerationRequest>;
  const resolvedNonProfit = await getMissionBriefById(id);

  if (!resolvedNonProfit && !body.nonprofitContext) {
    return NextResponse.json({ error: "Nonprofit context not found" }, { status: 404 });
  }

  const output = await generateCampaignVideoOutput({
    nonprofitId: id,
    nonprofitContext: resolvedNonProfit ?? body.nonprofitContext!,
    userPrompt: body.userPrompt,
  });

  return NextResponse.json(output);
}
