import { NextRequest } from "next/server";
import { GET } from "@/app/api/charities/route";

describe("GET /api/charities", () => {
  beforeAll(() => {
    // Ensure no Places API key so mock data path is exercised.
    delete process.env.GOOGLE_PLACES_API_KEY;
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
});
