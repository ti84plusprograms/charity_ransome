import { fetchLocalNonProfits, getNonProfitDetails } from "@/agents/scout";

describe("scout agent", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("fetchLocalNonProfits calls the expected endpoint and returns parsed data", async () => {
    const mockResults = [
      { id: "1", name: "Seattle Food Bank", address: "123 Pine St", city: "Seattle" },
    ];
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await fetchLocalNonProfits("Seattle");
    expect(result).toEqual(mockResults);
    expect(fetchMock).toHaveBeenCalledWith("/api/charities?city=Seattle&sortBy=rating");
  });

  it("fetchLocalNonProfits throws when response is not ok", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(fetchLocalNonProfits("Miami")).rejects.toThrow(
      "Failed to fetch non-profits: Internal Server Error"
    );
  });

  it("getNonProfitDetails calls the expected endpoint and returns parsed data", async () => {
    const mockResult = {
      id: "place-123",
      name: "Denver Youth Mentorship",
      address: "456 Elm St",
      city: "Denver",
      website: "https://example.org",
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await getNonProfitDetails("place-123");
    expect(result).toEqual(mockResult);
    expect(fetchMock).toHaveBeenCalledWith("/api/charities/place-123");
  });
});
