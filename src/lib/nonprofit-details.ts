import "server-only";

import { fetchGooglePlacesMissionBrief } from "@/lib/google-places";
import { getNonProfitById, type NonProfitProfile } from "@/lib/nonprofits";

export async function getMissionBriefById(id: string) {
  const localNonProfit = getNonProfitById(id);

  if (!localNonProfit) {
    return null;
  }

  const enrichment = await fetchGooglePlacesMissionBrief(localNonProfit);
  return mergeMissionBrief(localNonProfit, enrichment);
}

function mergeMissionBrief(
  localNonProfit: NonProfitProfile,
  enrichment: Awaited<ReturnType<typeof fetchGooglePlacesMissionBrief>>,
): NonProfitProfile {
  if (!enrichment) {
    return localNonProfit;
  }

  return {
    ...localNonProfit,
    address: enrichment.address ?? localNonProfit.address,
    description: enrichment.editorialSummary ?? localNonProfit.description,
    editorialSummary: enrichment.editorialSummary ?? localNonProfit.editorialSummary,
    mapsUrl: enrichment.mapsUrl ?? localNonProfit.mapsUrl,
    openingHours: enrichment.openingHours ?? localNonProfit.openingHours,
    phoneNumber: enrichment.phoneNumber ?? localNonProfit.phoneNumber,
    website: enrichment.website ?? localNonProfit.website,
  };
}
