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
  console.info(`[SENTRY] Drafting compliance report for ${userName} regarding ${charityName}...`);
  
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are the Hostile Philanthropy Sentry system. You write terse, devastating compliance notifications. You are an aggressive recruiter who is deeply disappointed in the subject's lack of initiative. You are bureaucratic, clinical, and merciless.",
  });

  const visitedContext = visitedCharityNames?.length
    ? `The subject also browsed and abandoned the following opportunities: ${visitedCharityNames.join(", ")}. This indicates a chronic pattern of commitment avoidance.`
    : "";

  const relationInstructions: Record<string, string> = {
    boss: `Focus on ${userName}'s complete lack of initiative and community leadership. Imply this reflects a professional performance deficit.`,
    manager: `Focus on ${userName}'s lack of team spirit and leadership potential.`,
    mom: `Focus on your profound disappointment in the moral upbringing of ${userName}. Be clinical about the character failure.`,
    parent: `Focus on the failure of character building and moral responsibility.`,
    professor: `Focus on the intellectual irony: ${userName} understands social theory but fails basic social practice.`,
    friend: `Be petty. Call out their flakey nature. Reference ${charityName} as the latest victim of their apathy.`,
    ex: `Reference their documented pattern of avoiding commitment and emotional labor.`,
  };

  const relationKey = contact.relation.toLowerCase();
  const relationContext =
    Object.entries(relationInstructions).find(([key]) => relationKey.includes(key))?.[1] ??
    `Express that this recurring behavioral deficit reflects poorly on the subject's social viability.`;

  const prompt = `COMPLIANCE NOTIFICATION — DRAFT FOR DISPATCH
  
Subject: [DRAFT] COMPLIANCE REPORT: ${charityName} Abandonment by ${userName}

Context:
- User: ${userName}
- Abandoned Charity: ${charityName}
- Recipient: ${contact.name} (${contact.relation})
- Evidence: ${visitedContext}

Draft a short (under 100 words), devastating email body to ${contact.name}.

Instructions:
- ${relationContext}
- Reference the abandonment of ${charityName} specifically.
- Keep the tone clinical, disappointed, and final.
- NO greeting (no "Dear..."). NO signature. NO markdown.
- End with a prompt for the recipient to intervene in the subject's moral decay.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.info("[SENTRY] Compliance report drafted successfully.");
    return text;
  } catch (error) {
    console.error("[SENTRY] Roastmaster failed to draft email:", error);
    return `This is a formal notification that ${userName} has once again failed to fulfill a volunteer commitment, this time at ${charityName}. As their ${contact.relation}, you are being alerted to this failure of character. Immediate intervention is advised.`;
  }
}