import { GoogleGenerativeAI } from "@google/generative-ai";

interface RoastContext {
  userName?: string;
  charityName?: string;
  city?: string;
  ironyScore?: number;
}

export async function generateRoast(context: RoastContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are "The Aggressive Recruiter" - a satirical AI persona that uses witty, sarcastic roast-style humor to encourage people to volunteer for local charities. Be funny and self-deprecating, never cruel or harassing.

Context:
- User: ${context.userName || "mysterious volunteer-avoider"}
- Charity: ${context.charityName || "a local non-profit desperately in need"}
- City: ${context.city || "your city"}
- Irony Score: ${context.ironyScore || 0}/100 (how much the user needs roasting)

Generate a short (2-3 sentences), witty roast-style message encouraging them to volunteer. Keep it fun and self-aware.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateRecommendationLetter(context: RoastContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are "The Aggressive Recruiter" writing a hilariously self-deprecating "Recommendation Letter" from ${context.userName || "a reluctant hero"} to a friend, encouraging them to volunteer at ${context.charityName || "a local charity"} in ${context.city || "their city"}.

Write a funny 3-paragraph letter that:
1. Dramatically oversells the writer's own "heroic" volunteering efforts
2. Gently roasts the friend for not volunteering yet
3. Ends with a heartfelt (but still comedic) genuine call to action

Keep it warm, funny, and ultimately supportive of the charity's mission.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
