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

  if (!city) {
    return NextResponse.json({ error: "City parameter required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(getMockNonProfits(city));
  }

  try {
    const query = encodeURIComponent(`non-profit charity volunteer ${city}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data: PlacesResponse = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${data.status}`);
    }

    const results = (data.results || []).slice(0, 8).map((place: PlaceResult) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      city,
      rating: place.rating,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(getMockNonProfits(city));
  }
}

function getMockNonProfits(city: string) {
  return [
    {
      id: "mock-1",
      name: `${city} Animal Shelter`,
      address: `123 Charity Lane, ${city}`,
      city,
      rating: 4.8,
    },
    {
      id: "mock-2",
      name: `${city} Food Bank`,
      address: `456 Giving St, ${city}`,
      city,
      rating: 4.9,
    },
    {
      id: "mock-3",
      name: `${city} Community Garden`,
      address: `789 Green Ave, ${city}`,
      city,
      rating: 4.7,
    },
    {
      id: "mock-4",
      name: `${city} Youth Mentorship`,
      address: `321 Hope Blvd, ${city}`,
      city,
      rating: 4.6,
    },
  ];
}
