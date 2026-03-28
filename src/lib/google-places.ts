import "server-only";

import type { NonProfitProfile } from "@/lib/nonprofits";

interface TextSearchResponse {
  status: string;
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    name?: string;
  }>;
}

interface PlaceDetailsResponse {
  status: string;
  result?: {
    editorial_summary?: { overview?: string };
    formatted_address?: string;
    formatted_phone_number?: string;
    opening_hours?: { weekday_text?: string[] };
    url?: string;
    website?: string;
  };
}

export interface GooglePlacesMissionBrief {
  address?: string;
  editorialSummary?: string;
  mapsUrl?: string;
  openingHours?: string[];
  phoneNumber?: string;
  website?: string;
}

export async function fetchGooglePlacesMissionBrief(
  nonProfit: NonProfitProfile,
): Promise<GooglePlacesMissionBrief | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return null;
  }

  const query = encodeURIComponent(
    nonProfit.placeQuery ?? `${nonProfit.name} ${nonProfit.city} ${nonProfit.state}`,
  );

  try {
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`,
      { next: { revalidate: 3600 } },
    );
    const searchData = (await searchResponse.json()) as TextSearchResponse;
    const placeId = searchData.results?.[0]?.place_id;

    if (!placeId) {
      return null;
    }

    const fields = [
      "editorial_summary",
      "formatted_address",
      "formatted_phone_number",
      "opening_hours",
      "url",
      "website",
    ].join(",");
    const detailsResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`,
      { next: { revalidate: 3600 } },
    );
    const detailsData = (await detailsResponse.json()) as PlaceDetailsResponse;

    if (detailsData.status !== "OK") {
      return null;
    }

    return {
      address: detailsData.result?.formatted_address ?? searchData.results?.[0]?.formatted_address,
      editorialSummary: detailsData.result?.editorial_summary?.overview,
      mapsUrl: detailsData.result?.url,
      openingHours: detailsData.result?.opening_hours?.weekday_text,
      phoneNumber: detailsData.result?.formatted_phone_number,
      website: detailsData.result?.website,
    };
  } catch (error) {
    console.error("Google Places mission brief enrichment failed:", error);
    return null;
  }
}
