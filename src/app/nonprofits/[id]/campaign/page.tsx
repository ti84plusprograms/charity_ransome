import { notFound } from "next/navigation";
import { getMissionBriefById } from "@/lib/nonprofit-details";
import { CampaignStudioClient } from "./CampaignStudioClient";

export default async function NonProfitCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nonProfit = await getMissionBriefById(id);

  if (!nonProfit) {
    notFound();
  }

  return <CampaignStudioClient initialNonProfit={nonProfit} />;
}
