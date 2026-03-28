import { GoogleGenerativeAI } from "@google/generative-ai";

interface RoastContext {
  userName?: string;
  charityName?: string;
  city?: string;
  ironyScore?: number;
  visitedCharityNames?: string[];
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
  return new GoogleGenerativeAI(apiKey);
}

export async function generateRoast(context: RoastContext): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const visitedList = context.visitedCharityNames?.length
    ? `They've also looked at and ignored: ${context.visitedCharityNames.join(", ")}.`
    : "";

  const prompt = `You are "The Aggressive Recruiter" — a biting, sardonic AI that shames people into volunteering. Your tone is that of a disappointed HR manager who has given up on being professional.

Context:
- User: ${context.userName || "this particular coward"}
- Charity being abandoned: ${context.charityName || "a local nonprofit desperately in need"}
- City: ${context.city || "their city"}
- Shame Level: ${context.ironyScore || 0}/100
${visitedList}

Write 2-3 sentences that are:
1. Specific to the charity they're abandoning
2. Ruthlessly funny — not generic platitudes
3. Reference their browsing pattern if they've visited multiple charities
4. End with a concrete call to action that sounds like a threat

No hedging. No "but seriously". Go.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateRecommendationLetter(context: RoastContext): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are "The Aggressive Recruiter" writing a forensic audit report disguised as a recommendation letter from ${context.userName || "Subject Zero"} to a friend, regarding their complete failure to volunteer at ${context.charityName || "a local charity"} in ${context.city || "their city"}.

Write 3 paragraphs:
1. A devastatingly specific account of what they did instead of volunteering (browsed, tabbed out, stared at the ceiling)
2. A clinical assessment of the damage their inaction caused to ${context.charityName || "the charity"}
3. A final paragraph that is a thinly veiled ultimatum disguised as warmth

Keep it darkly funny. This is satire with teeth.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Roastmaster Agent: Generates a shame email draft to send to the user's accountability contact.
 * Runs server-side only via the Gemini SDK directly.
 */

interface AccountabilityContact {
  name: string;
  email: string;
  relation: string;
}

export async function generateExitEmailDraft(
  userName: string,
  charityName: string,
  contact: AccountabilityContact,
  visitedCharityNames?: string[]
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are the Hostile Philanthropy Sentry system. You write terse, devastating compliance notifications. You are not funny. You are bureaucratic and merciless.",
  });

  const visitedContext = visitedCharityNames?.length
    ? `They also browsed and abandoned: ${visitedCharityNames.join(", ")}.`
    : "";

  const relationInstructions: Record<string, string> = {
    boss: `Focus on ${userName}'s complete lack of initiative and community leadership. Imply this is a performance issue.`,
    manager: `Focus on ${userName}'s complete lack of initiative and community leadership. Imply this is a performance issue.`,
    mom: `Focus on your profound disappointment in how ${contact.name} raised ${userName}. Be specific about the moral failure.`,
    parent: `Focus on your profound disappointment in how ${contact.name} raised ${userName}. Be specific about the moral failure.`,
    professor: `Focus on the irony of someone educated enough to understand social responsibility but too self-involved to act on it.`,
    friend: `Be petty. Mock their character. Reference the specific charity to make it sting.`,
    ex: `Be petty. Tie their failure to volunteer to their documented pattern of avoiding commitment.`,
  };

  const relationKey = contact.relation.toLowerCase();
  const relationContext =
    Object.entries(relationInstructions).find(([key]) => relationKey.includes(key))?.[1] ??
    `Express that this behavior reflects poorly on everyone who knows ${userName}.`;

  const prompt = `COMPLIANCE NOTIFICATION — DRAFT FOR DISPATCH

Subject: ${userName} has failed to volunteer at ${charityName}.

${visitedContext}

Write a short (under 120 words), devastating email body to ${contact.name}, the ${contact.relation} of ${userName}.

Instructions:
- ${relationContext}
- Reference ${charityName} specifically
- Tone: bureaucratic, disappointed, final
- End with a line implying the recipient should intervene
- No subject line. No markdown. Raw text only.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Roastmaster failed to draft email:", error);
    return `Dear ${contact.name},\n\nWe regret to inform you that ${userName} has abandoned ${charityName}. This is the ${contact.relation}'s problem now.\n\nRegards,\nThe Sentry`;
  }
}