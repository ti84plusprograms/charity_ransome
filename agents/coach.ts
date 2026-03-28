import type { NonProfitProfile } from "@/lib/nonprofits";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CoachMessage {
  message: string;
  emoji: string;
  link?: string;
}

const GENERIC_SHAMES: CoachMessage[] = [
  { message: "You opened a volunteering app and immediately tried to leave. Let that sink in.", emoji: "🫥" },
  { message: "Incredible. You found a way to ghost a charity before even committing. New low.", emoji: "🏆" },
  { message: "Somewhere, a puppy is waiting. You are on Reddit.", emoji: "🐶" },
  { message: "The audacity to close this tab while nonprofits are literally collecting cans. Wild.", emoji: "🗑️" },
];

const ESCALATED_SHAMES: CoachMessage[] = [
  { message: "This is your third escape attempt. At this point you're doing more damage than if you'd never opened the app.", emoji: "🚨" },
  { message: "Three tab switches. We've reported this to your emergency contact. They're not surprised.", emoji: "📧" },
  { message: "You have now abandoned local charities more times than you've replied to texts. We're escalating.", emoji: "📵" },
];

const CATEGORY_MESSAGES: Record<string, CoachMessage[]> = {
  animal: [
    { message: "NAME needs volunteers and you need a better excuse. You don't have one.", emoji: "🐾" },
    { message: "The animals at NAME cannot leave. You can. Interesting that you're choosing to.", emoji: "😿" },
    { message: "NAME is still waiting. The animals, less patiently.", emoji: "🚫" },
  ],
  environment: [
    { message: "You're abandoning NAME. The environment will remember this personally.", emoji: "🌍" },
    { message: "NAME needs people who care about more than their browser history. Prove you're one.", emoji: "🔥" },
    { message: "Climate work doesn't pause because you got distracted. NAME doesn't either.", emoji: "🌲" },
  ],
  humanitarian: [
    { message: "Real people are waiting on NAME. You are waiting on nothing.", emoji: "🩸" },
    { message: "NAME serves your community. You are currently serving yourself by leaving.", emoji: "🆘" },
    { message: "People in your city need NAME volunteers. You have Wi-Fi and excuses.", emoji: "🫀" },
  ],
};

export function getCoachMessage(nonProfit?: NonProfitProfile | null, tabSwitchCount: number = 0): CoachMessage {
  const baseLink = nonProfit ? `/nonprofits/${nonProfit.id}` : "/";

  if (tabSwitchCount >= 3) {
    const msg = ESCALATED_SHAMES[Math.floor(Math.random() * ESCALATED_SHAMES.length)];
    return { ...msg, link: baseLink };
  }

  if (!nonProfit) {
    const msg = GENERIC_SHAMES[Math.floor(Math.random() * GENERIC_SHAMES.length)];
    return { ...msg, link: baseLink };
  }

  const category = nonProfit.category?.toLowerCase() || "";
  let pool: CoachMessage[] = [];

  if (category.includes("animal")) pool = CATEGORY_MESSAGES.animal;
  else if (category.includes("environment")) pool = CATEGORY_MESSAGES.environment;
  else if (category.includes("humanitarian") || category.includes("health")) pool = CATEGORY_MESSAGES.humanitarian;

  if (pool.length > 0) {
    const choice = pool[Math.floor(Math.random() * pool.length)];
    return {
      message: choice.message.replace("NAME", nonProfit.name),
      emoji: choice.emoji,
      link: baseLink
    };
  }

  return {
    message: `${nonProfit.name} is still here. You almost weren't. Think about that.`,
    emoji: "📌",
    link: baseLink
  };
}

export function getTabReturnMessage(nonProfit?: NonProfitProfile | null): string {
  const name = nonProfit?.name;
  const messages = name ? [
    `Welcome back. ${name} is still here. Unlike your focus.`,
    `Good. You returned. ${name} was starting to think you were the problem.`,
    `Back so soon? ${name} would prefer you never left.`,
    `${name} noticed you were gone. So did we.`,
  ] : [
    "You came back. Charities everywhere are cautiously optimistic.",
    "Welcome back to the app you almost abandoned. Again.",
    "Returned. Progress. Minimal, but noted.",
    "Back. The charities have been briefed. Don't make this a pattern.",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export interface SentryContext {
  currentCharity: NonProfitProfile | null;
  visitedCharities: NonProfitProfile[];
  event: "exit_intent" | "tab_switch";
  tabSwitchCount: number;
  emergencyContact: string;
  userName?: string;
}

export async function generateSentryAudit(context: SentryContext): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Our systems are down but your betrayal is fully documented offline.";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const visitedNames = context.visitedCharities.map(c => c.name).join(", ");
  const isEscalated = context.tabSwitchCount >= 3;
  const eventDesc = context.event === "exit_intent" ? "trying to leave the site" : "switching tabs";

  const prompt = `You are the Sentry — a sardonic AI shame officer for a volunteer app. You write short, punchy callouts. No long sentences, no complex words, no jargon.

The user is ${eventDesc}.
${context.userName ? `Their name is ${context.userName}.` : ""}
Charity they're abandoning: ${context.currentCharity?.name || "a local charity"}.
${context.currentCharity?.city ? `City: ${context.currentCharity.city}.` : ""}
Other charities they browsed and ditched: ${visitedNames || "none"}.
Times they've done this today: ${context.tabSwitchCount}.
${isEscalated ? `ESCALATED: mention that ${context.emergencyContact} is being notified.` : "Do NOT mention any emergency contact."}

Write ONE short, punchy sentence (max 20 words). Rules:
- Plain everyday language only — no jargon
- Name the specific charity
- Be mean but specific, not generic
- ${isEscalated ? "End with a threat involving their emergency contact" : "No mention of any contact or consequences — just shame them for leaving"}
- No markdown, no emojis, no quotes`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
