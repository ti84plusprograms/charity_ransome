import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  CampaignGenerationRequest,
  CampaignScene,
  CampaignVideoOutput,
} from "@/lib/campaign";
import type { NonProfitProfile } from "@/lib/nonprofits";

export async function generateCampaignVideoOutput({
  nonprofitContext,
  userPrompt,
}: CampaignGenerationRequest): Promise<CampaignVideoOutput> {
  const prompt = buildCampaignPrompt(nonprofitContext, userPrompt);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallbackCampaignOutput(nonprofitContext, userPrompt);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = parseCampaignResponse(raw);

    if (!parsed) {
      return buildFallbackCampaignOutput(nonprofitContext, userPrompt);
    }

    return normalizeCampaignOutput(parsed, nonprofitContext, userPrompt);
  } catch (error) {
    console.error("Campaign generation failed, using fallback output:", error);
    return buildFallbackCampaignOutput(nonprofitContext, userPrompt);
  }
}

function buildCampaignPrompt(nonprofit: NonProfitProfile, userPrompt?: string) {
  const direction = userPrompt?.trim()
    ? userPrompt.trim()
    : "No extra user direction was provided. Choose the strongest default campaign angle from the nonprofit mission, urgency, current needs, and city context.";

  return `You are a nonprofit creative strategist building a supportive, energetic 30-second volunteer recruitment campaign.

Important rules:
- Use the nonprofit context first.
- If the user direction is blank or generic, infer a strong default direction from the nonprofit's mission and current needs.
- Keep the campaign ethical, community-minded, and non-coercive.
- Return only valid JSON.
- The output should feel like a polished video concept/storyboard for a campaign studio.

Nonprofit context:
- Name: ${nonprofit.name}
- Category: ${nonprofit.category}
- Mission: ${nonprofit.mission}
- Description: ${nonprofit.description}
- What they do: ${nonprofit.whatTheyDo}
- Why this matters now: ${nonprofit.whyThisMattersNow}
- Current needs: ${nonprofit.currentNeeds.join("; ")}
- City: ${nonprofit.city}
- Address: ${nonprofit.address}
- Website: ${nonprofit.website ?? "Not available"}
- Open volunteer slots: ${nonprofit.openRoles}
- Rating: ${nonprofit.rating}
- Review count: ${nonprofit.reviewCount}
- Compliance priority: ${nonprofit.compliancePriority}
- Latest note: ${nonprofit.latestNote}

User direction:
${direction}

Return this exact JSON shape:
{
  "videoTitle": "",
  "hookLine": "",
  "targetAudience": "",
  "concept": "",
  "narrationScript": "",
  "sceneBreakdown": [
    {
      "scene": 1,
      "visual": "",
      "voiceover": "",
      "onscreenText": ""
    }
  ],
  "onScreenText": "",
  "callToAction": "",
  "tone": "",
  "visualStyle": ""
}

Generate 3 to 5 scenes.`;
}

function parseCampaignResponse(raw: string): Partial<CampaignVideoOutput> | null {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!candidate) {
    return null;
  }

  try {
    return JSON.parse(candidate) as Partial<CampaignVideoOutput>;
  } catch {
    return null;
  }
}

function normalizeCampaignOutput(
  parsed: Partial<CampaignVideoOutput>,
  nonprofit: NonProfitProfile,
  userPrompt?: string,
): CampaignVideoOutput {
  const fallback = buildFallbackCampaignOutput(nonprofit, userPrompt);
  const safeScenes = Array.isArray(parsed.sceneBreakdown)
    ? parsed.sceneBreakdown
        .slice(0, 5)
        .map((scene, index) => normalizeScene(scene, index + 1, fallback.sceneBreakdown[index]))
        .filter(Boolean) as CampaignScene[]
    : [];

  return {
    videoTitle: parsed.videoTitle?.trim() || fallback.videoTitle,
    hookLine: parsed.hookLine?.trim() || fallback.hookLine,
    targetAudience: parsed.targetAudience?.trim() || fallback.targetAudience,
    concept: parsed.concept?.trim() || fallback.concept,
    narrationScript: parsed.narrationScript?.trim() || fallback.narrationScript,
    sceneBreakdown: safeScenes.length ? safeScenes : fallback.sceneBreakdown,
    onScreenText: parsed.onScreenText?.trim() || fallback.onScreenText,
    callToAction: parsed.callToAction?.trim() || fallback.callToAction,
    tone: parsed.tone?.trim() || fallback.tone,
    visualStyle: parsed.visualStyle?.trim() || fallback.visualStyle,
  };
}

function normalizeScene(
  scene: Partial<CampaignScene>,
  sceneNumber: number,
  fallback?: CampaignScene,
) {
  const safeFallback =
    fallback ??
    ({
      scene: sceneNumber,
      visual: "",
      voiceover: "",
      onscreenText: "",
    } satisfies CampaignScene);

  return {
    scene: typeof scene.scene === "number" ? scene.scene : safeFallback.scene,
    visual: scene.visual?.trim() || safeFallback.visual,
    voiceover: scene.voiceover?.trim() || safeFallback.voiceover,
    onscreenText: scene.onscreenText?.trim() || safeFallback.onscreenText,
  };
}

function buildFallbackCampaignOutput(
  nonprofit: NonProfitProfile,
  userPrompt?: string,
): CampaignVideoOutput {
  const direction = userPrompt?.trim();
  const tone = inferTone(direction, nonprofit);
  const targetAudience = inferAudience(direction, nonprofit);
  const visualStyle = inferVisualStyle(direction, nonprofit);
  const callToAction = `Volunteer with ${nonprofit.name} in ${nonprofit.city} and help with ${nonprofit.currentNeeds[0]?.toLowerCase() ?? "their next open shift"}.`;
  const concept = direction
    ? `A 30-second ${tone.toLowerCase()} recruitment spot for ${targetAudience.toLowerCase()} that uses ${nonprofit.name}'s mission, urgency, and current needs as the core story while leaning into this direction: "${direction}".`
    : `A 30-second ${tone.toLowerCase()} recruitment spot that introduces ${nonprofit.name}, shows why the work matters right now, and ends with a clear invitation to fill active volunteer needs.`;
  const scenes: CampaignScene[] = [
    {
      scene: 1,
      visual: `Fast opening shot of ${nonprofit.city} and volunteers connected to ${nonprofit.category.toLowerCase()} work.`,
      voiceover: `${nonprofit.city} already knows ${nonprofit.name} is doing important work. The question is who is showing up next.`,
      onscreenText: `${nonprofit.name} | ${nonprofit.city}`,
    },
    {
      scene: 2,
      visual: `Close-up moments that show ${nonprofit.currentNeeds[0]?.toLowerCase() ?? "current volunteer support"} in action.`,
      voiceover: `${nonprofit.mission}`,
      onscreenText: `${nonprofit.openRoles} volunteer openings`,
    },
    {
      scene: 3,
      visual: `Quick montage of volunteers helping across the organization with warm, human detail.`,
      voiceover: `${nonprofit.whyThisMattersNow}`,
      onscreenText: `Priority ${nonprofit.compliancePriority} | ${nonprofit.reviewCount} community reviews`,
    },
    {
      scene: 4,
      visual: `Bold closing frame with energetic text, branded color treatment, and a clear volunteer ask.`,
      voiceover: callToAction,
      onscreenText: `Join ${nonprofit.name} now`,
    },
  ];

  return {
    videoTitle: `${nonprofit.name}: Show Up for ${nonprofit.city}`,
    hookLine: `${nonprofit.openRoles} open volunteer slots. One strong 30 seconds to fill them.`,
    targetAudience,
    concept,
    narrationScript: scenes.map((scene) => scene.voiceover).join(" "),
    sceneBreakdown: scenes,
    onScreenText: `${nonprofit.name} • ${nonprofit.currentNeeds[0] ?? "Volunteer now"} • ${nonprofit.city}`,
    callToAction,
    tone,
    visualStyle,
  };
}

function inferTone(direction: string | undefined, nonprofit: NonProfitProfile) {
  const normalized = direction?.toLowerCase() ?? "";

  if (normalized.includes("fast") || normalized.includes("social")) {
    return "Fast, energetic, social-first";
  }
  if (normalized.includes("emotional") || normalized.includes("community")) {
    return "Warm, emotional, community-focused";
  }
  if (normalized.includes("college") || normalized.includes("student")) {
    return "Upbeat, direct, campus-friendly";
  }
  if (nonprofit.compliancePriority >= 90) {
    return "Urgent but hopeful";
  }
  return "Supportive, motivating, polished";
}

function inferAudience(direction: string | undefined, nonprofit: NonProfitProfile) {
  const normalized = direction?.toLowerCase() ?? "";

  if (normalized.includes("college") || normalized.includes("student")) {
    return "College students and early-career volunteers";
  }
  if (normalized.includes("family")) {
    return "Families and local community members";
  }
  if (normalized.includes("social media")) {
    return "Younger social-first local volunteers";
  }
  return `${nonprofit.city}-area volunteers who care about ${nonprofit.category.toLowerCase()} impact`;
}

function inferVisualStyle(direction: string | undefined, nonprofit: NonProfitProfile) {
  const normalized = direction?.toLowerCase() ?? "";

  if (normalized.includes("social") || normalized.includes("fast")) {
    return "Quick-cut vertical-video energy with bold captions and high-contrast nonprofit branding";
  }
  if (normalized.includes("emotional")) {
    return "Warm documentary-style visuals with close human details and soft motion graphics";
  }
  return `Clean, modern nonprofit storytelling with ${nonprofit.city} location texture and bold callout text`;
}
