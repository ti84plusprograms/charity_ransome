import { notFound } from "next/navigation";
import { getNonProfitById } from "@/lib/nonprofits";
import { MissionBriefClient } from "./MissionBriefClient";

export default async function NonProfitMissionBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nonProfit = getNonProfitById(id);

  if (!nonProfit) {
    notFound();
  }

  return <MissionBriefClient initialNonProfit={nonProfit} />;
}
