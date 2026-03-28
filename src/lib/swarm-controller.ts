import { fetchLocalNonProfits } from "@/agents/scout";

export async function initializeSwarm(city: string, userName: string, ironyScore: number) {
  // Trigger both agent tasks simultaneously
  const [charityResults, openingRoastResponse] = await Promise.all([
    fetchLocalNonProfits(city),
    fetch("/api/shoutout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "roast", userName, ironyScore }),
    }).then(res => res.json())
  ]);

  return {
    charities: charityResults,
    roast: openingRoastResponse.message
  };
}