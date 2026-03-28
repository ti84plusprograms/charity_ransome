import { NextResponse } from "next/server";
import { buildNonprofitContext, type CampaignGenerationRequest } from "@/lib/campaign";
import { generateCampaignVideoOutput } from "@/lib/campaign-generator";
import { getMissionBriefById } from "@/lib/nonprofit-details";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<CampaignGenerationRequest>;
  const resolvedNonProfit = await getMissionBriefById(id);
  const nonprofitContext = resolvedNonProfit
    ? buildNonprofitContext(resolvedNonProfit)
    : body.nonprofitContext;

  if (!nonprofitContext) {
    return NextResponse.json({ error: "Nonprofit context not found" }, { status: 404 });
  }

  const output = await generateCampaignVideoOutput({
    nonprofitId: id,
    nonprofitContext,
    userPrompt: body.userPrompt,
  });

  return NextResponse.json(output);
}
