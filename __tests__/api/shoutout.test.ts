import { NextRequest } from "next/server";
import { POST } from "@/app/api/shoutout/route";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/shoutout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/shoutout", () => {
  beforeAll(() => {
    // No Gemini key → fallback messages are returned.
    delete process.env.GEMINI_API_KEY;
  });

  describe("type = roast (no API key)", () => {
    it("returns HTTP 200 with a fallback message string", async () => {
      const req = makeRequest({ type: "roast", userName: "Alice", ironyScore: 30 });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe("type = letter (no API key)", () => {
    it("returns HTTP 200 with a fallback message string", async () => {
      const req = makeRequest({
        type: "letter",
        userName: "Bob",
        charityName: "Food Bank",
        city: "Austin",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
    });
  });

  describe("type = send", () => {
    it("returns HTTP 200 with success: true", async () => {
      const req = makeRequest({
        type: "send",
        recipientEmail: "friend@example.com",
        letter: "Here is your letter!",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(typeof body.message).toBe("string");
    });
  });

  describe("unknown type", () => {
    it("returns HTTP 400 with an error field", async () => {
      const req = makeRequest({ type: "unknown" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
