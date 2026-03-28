import { getCoachMessage, getTabReturnMessage } from "@/agents/coach";

describe("coach agent", () => {
  describe("getCoachMessage()", () => {
    it("returns an object with a non-empty message string", () => {
      const result = getCoachMessage();
      expect(typeof result.message).toBe("string");
      expect(result.message.length).toBeGreaterThan(0);
    });

    it("returns an object with a non-empty emoji string", () => {
      const result = getCoachMessage();
      expect(typeof result.emoji).toBe("string");
      expect(result.emoji.length).toBeGreaterThan(0);
    });

    it("returns a different message across multiple calls (stochastic check)", () => {
      const messages = new Set(
        Array.from({ length: 20 }, () => getCoachMessage().message)
      );
      // With 8 possible messages and 20 draws, the chance of only 1 unique is negligible.
      expect(messages.size).toBeGreaterThan(1);
    });
  });

  describe("getTabReturnMessage()", () => {
    it("returns a non-empty string", () => {
      const result = getTabReturnMessage();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns a different message across multiple calls (stochastic check)", () => {
      const messages = new Set(
        Array.from({ length: 20 }, () => getTabReturnMessage())
      );
      expect(messages.size).toBeGreaterThan(1);
    });
  });
});
