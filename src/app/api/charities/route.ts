import { NextRequest, NextResponse } from "next/server";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
}

interface PlacesResponse {
  status: string;
  results: PlaceResult[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const sortBy = searchParams.get("sortBy") || "rating"; // Default sort by rating

  if (!city) {
    return NextResponse.json({ error: "City parameter required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    let mockData = getMockNonProfits(city);
    return NextResponse.json(sortResults(mockData, sortBy));
  }

  try {
    const query = encodeURIComponent(`non-profit charity volunteer ${city}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data: PlacesResponse = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${data.status}`);
    }

    let results = (data.results || []).map((place: PlaceResult) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      city,
      rating: place.rating || 0,
      urgencyScore: Math.floor(Math.random() * 10) + 1, // Simulated mission urgency
    }));

    return NextResponse.json(sortResults(results, sortBy));
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(sortResults(getMockNonProfits(city), sortBy));
  }
}

function sortResults(results: any[], sortBy: string) {
  if (sortBy === "rating") {
    return results.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "urgency") {
    return results.sort((a, b) => b.urgencyScore - a.urgencyScore);
  } else if (sortBy === "name") {
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }
  return results;
}

function getMockNonProfits(city: string) {
  return [
    {
      id: "mock-1",
      name: `${city} Animal Shelter`,
      address: `123 Charity Lane, ${city}`,
      city,
      rating: 4.8,
      urgencyScore: 9,
    },
    {
      id: "mock-2",
      name: `${city} Food Bank`,
      address: `456 Giving St, ${city}`,
      city,
      rating: 4.9,
      urgencyScore: 7,
    },
    {
      id: "mock-3",
      name: `${city} Community Garden`,
      address: `789 Green Ave, ${city}`,
      city,
      rating: 4.7,
      urgencyScore: 4,
    },
    {
      id: "mock-4",
      name: `${city} Youth Mentorship`,
      address: `321 Hope Blvd, ${city}`,
      city,
      rating: 4.6,
      urgencyScore: 6,
    },
  ];
}