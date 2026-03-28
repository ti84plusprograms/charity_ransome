import { NextRequest } from "next/server";
import { GET } from "@/app/api/charities/route";

describe("GET /api/charities", () => {
  const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Ensure no Places API key so mock data path is exercised.
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey) {
      process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_PLACES_API_KEY;
    }
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalApiKey) {
      process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_PLACES_API_KEY;
    }
  });

  it("returns 400 when city parameter is missing", async () => {
    const req = new NextRequest("http://localhost/api/charities");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "City parameter required" });
  });

  it("returns mock charities when no API key is configured", async () => {
    const req = new NextRequest("http://localhost/api/charities?city=Springfield");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(4);
  });

  it("mock results contain the requested city name", async () => {
    const city = "Portland";
    const req = new NextRequest(`http://localhost/api/charities?city=${city}`);
    const res = await GET(req);
    const body = await res.json();
    body.forEach((item: { city: string; name: string }) => {
      expect(item.city).toBe(city);
      expect(item.name).toContain(city);
    });
  });

  it("mock results include expected fields", async () => {
    const req = new NextRequest("http://localhost/api/charities?city=Denver");
    const res = await GET(req);
    const body = await res.json();
    body.forEach((item: Record<string, unknown>) => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("address");
      expect(item).toHaveProperty("city");
      expect(item).toHaveProperty("rating");
    });
  });

  it("uses Google Places API when key is configured", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "p-1",
            name: "Austin Food Helpers",
            formatted_address: "123 Main St, Austin, TX",
            rating: 4.9,
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const req = new NextRequest("http://localhost/api/charities?city=Austin");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        id: "p-1",
        name: "Austin Food Helpers",
        address: "123 Main St, Austin, TX",
        city: "Austin",
        rating: 4.9,
        urgencyScore: expect.any(Number),
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "https://maps.googleapis.com/maps/api/place/textsearch/json?query=non-profit%20charity%20volunteer%20Austin&key=test-key"
    );
  });

  it("falls back to mock data when Places API returns an error status", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "REQUEST_DENIED",
        results: [],
      }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const req = new NextRequest("http://localhost/api/charities?city=Phoenix");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(4);
    body.forEach((item: { city: string }) => {
      expect(item.city).toBe("Phoenix");
    });
  });
});
