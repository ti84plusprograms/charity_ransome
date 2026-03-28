import { generateRoast, generateRecommendationLetter } from "@/agents/roastmaster";

describe("roastmaster agent (mock mode — no API key)", () => {
  beforeAll(() => {
    // Ensure no API key is set so the fallback path is exercised.
    delete process.env.GEMINI_API_KEY;
  });

  describe("generateRoast()", () => {
    it("throws an error when GEMINI_API_KEY is not set", async () => {
      await expect(
        generateRoast({ userName: "Alice", charityName: "Test Shelter", city: "Boston" })
      ).rejects.toThrow("GEMINI_API_KEY environment variable is not set.");
    });
  });

  describe("generateRecommendationLetter()", () => {
    it("throws an error when GEMINI_API_KEY is not set", async () => {
      await expect(
        generateRecommendationLetter({ userName: "Bob", charityName: "Food Bank", city: "Austin" })
      ).rejects.toThrow("GEMINI_API_KEY environment variable is not set.");
    });
  });
});
