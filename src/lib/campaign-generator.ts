import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  CampaignGenerationRequest,
  CampaignScene,
  CampaignVideoOutput,
  CampaignVideoPlan,
  NonprofitContext,
  ScenePlan,
} from "@/lib/campaign";

const PLANNING_MODEL = process.env.GEMINI_PLANNING_MODEL ?? "gemini-2.0-flash";
const FALLBACK_DURATIONS = [8, 8, 8, 6] as const;

type PartialCampaignPlan = Partial<CampaignVideoPlan> & {
  scenes?: Array<Partial<ScenePlan>>;
};

export async function generateCampaignVideoOutput({
  nonprofitContext,
  userPrompt,
}: CampaignGenerationRequest): Promise<CampaignVideoOutput> {
  const plan = await planCampaignVideo({
    nonprofitId: nonprofitContext.id,
    nonprofitContext,
    userPrompt,
  });

  return campaignPlanToStoryboard(plan, nonprofitContext, userPrompt);
}

export async function planCampaignVideo({
  nonprofitContext,
  userPrompt,
}: CampaignGenerationRequest): Promise<CampaignVideoPlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallbackCampaignPlan(nonprofitContext, userPrompt);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: PLANNING_MODEL });
    const result = await model.generateContent(
      buildCampaignPlanPrompt(nonprofitContext, userPrompt),
    );
    const raw = result.response.text();
    const parsed = parseCampaignPlanResponse(raw);

    if (!parsed) {
      return buildFallbackCampaignPlan(nonprofitContext, userPrompt);
    }

    return normalizeCampaignPlan(parsed, nonprofitContext, userPrompt);
  } catch (error) {
    console.error("Campaign planning failed, using fallback plan:", error);
    return buildFallbackCampaignPlan(nonprofitContext, userPrompt);
  }
}

export function campaignPlanToStoryboard(
  plan: CampaignVideoPlan,
  nonprofit: NonprofitContext,
  userPrompt?: string,
): CampaignVideoOutput {
  const visualStyle = plan.visualStyle?.trim() || inferVisualStyle(userPrompt, nonprofit);
  const sceneBreakdown: CampaignScene[] = plan.scenes.map((scene) => ({
    scene: scene.sceneNumber,
    visual: scene.visualPrompt,
    voiceover: scene.voiceover,
    onscreenText: scene.onscreenText,
  }));

  return {
    videoTitle: plan.campaignTitle,
    hookLine: plan.scenes[0]?.onscreenText || `${nonprofit.name} needs more volunteers now.`,
    targetAudience: plan.targetAudience,
    concept: summarizeConcept(plan, nonprofit),
    narrationScript: plan.scenes.map((scene) => scene.voiceover).join(" "),
    sceneBreakdown,
    onScreenText: plan.scenes.map((scene) => scene.onscreenText).filter(Boolean).join(" • "),
    callToAction: plan.callToAction,
    tone: plan.tone,
    visualStyle,
  };
}

export function buildFallbackCampaignPlan(
  nonprofit: NonprofitContext,
  userPrompt?: string,
): CampaignVideoPlan {
  const direction = userPrompt?.trim();
  const tone = inferTone(direction, nonprofit);
  const targetAudience = inferAudience(direction, nonprofit);
  const visualStyle = inferVisualStyle(direction, nonprofit);
  const callToAction = `Volunteer with ${nonprofit.name} in ${nonprofit.city} and help with ${nonprofit.currentNeeds[0]?.toLowerCase() ?? "their next open shift"}.`;

  return {
    campaignTitle: `${nonprofit.name}: Show Up for ${nonprofit.city}`,
    tone,
    targetAudience,
    callToAction,
    totalDurationSeconds: 30,
    visualStyle,
    scenes: [
      {
        sceneNumber: 1,
        durationSeconds: FALLBACK_DURATIONS[0],
        purpose: "Hook",
        voiceover: `${nonprofit.city} already knows ${nonprofit.name} is doing important work. The question is who is showing up next.`,
        onscreenText: `${nonprofit.name} | ${nonprofit.city}`,
        visualPrompt: `Fast portrait opening on ${nonprofit.city} streets and volunteers moving into ${nonprofit.category.toLowerCase()} work with real community energy.`,
        transitionNote: "Open on motion and cut quickly into the mission.",
      },
      {
        sceneNumber: 2,
        durationSeconds: FALLBACK_DURATIONS[1],
        purpose: "Mission",
        voiceover: nonprofit.mission,
        onscreenText: `${nonprofit.volunteerSlots} volunteer openings`,
        visualPrompt: `Warm documentary-style portrait footage showing ${nonprofit.currentNeeds[0]?.toLowerCase() ?? "current volunteer support"} in action for ${nonprofit.name}.`,
        transitionNote: "Push closer into the human impact.",
      },
      {
        sceneNumber: 3,
        durationSeconds: FALLBACK_DURATIONS[2],
        purpose: "Urgency",
        voiceover: nonprofit.whyThisMattersNow,
        onscreenText: `${nonprofit.urgency} priority • ${nonprofit.reviews} community reviews`,
        visualPrompt: `Portrait montage of volunteers collaborating, smiling, and solving real needs tied to ${nonprofit.currentNeeds.slice(0, 2).join(" and ")}.`,
        transitionNote: "Keep the pace moving while staying grounded and human.",
      },
      {
        sceneNumber: 4,
        durationSeconds: FALLBACK_DURATIONS[3],
        purpose: "Call to action",
        voiceover: callToAction,
        onscreenText: `Join ${nonprofit.name} now`,
        visualPrompt: `Bold portrait closing frame with active volunteers, subtle motion graphics energy, and a clean nonprofit recruitment finish for ${nonprofit.name}.`,
        transitionNote: "Finish with a clear volunteer ask and memorable closing frame.",
      },
    ],
  };
}

function buildCampaignPlanPrompt(nonprofit: NonprofitContext, userPrompt?: string) {
  const direction = userPrompt?.trim()
    ? userPrompt.trim()
    : "No extra user direction was provided. Infer the strongest default volunteer-recruitment angle from the nonprofit mission, urgency, city, and current needs.";

  return `You are a nonprofit creative strategist planning a real 30-second vertical volunteer recruitment ad for a short-form social video feed.

Important rules:
- The nonprofit context is the source of truth.
- This is a 9:16 portrait volunteer recruitment reel.
- If user direction is blank, create the best default campaign direction from the nonprofit context alone.
- Keep the language realistic, nonprofit-safe, supportive, and community-minded.
- Create exactly 4 scenes.
- Use scene durations of 8, 8, 8, and 6 seconds so the plan totals 30 seconds.
- Make the first scene hook attention immediately and the final scene deliver a strong volunteer CTA.
- Write concise but cinematic visual prompts that can be passed to a video generation model.
- Return strict JSON only. No markdown, no commentary.

Nonprofit context:
- Name: ${nonprofit.name}
- Category: ${nonprofit.category}
- Mission: ${nonprofit.mission}
- Description: ${nonprofit.description}
- What they do: ${nonprofit.whatTheyDo}
- Why this matters now: ${nonprofit.whyThisMattersNow}
- Urgency label: ${nonprofit.urgency}
- Urgency score: ${nonprofit.urgencyScore}
- Current needs: ${nonprofit.currentNeeds.join("; ")}
- City: ${nonprofit.city}
- Address: ${nonprofit.address}
- Website: ${nonprofit.website ?? "Not available"}
- Volunteer slots: ${nonprofit.volunteerSlots}
- Rating: ${nonprofit.rating}
- Reviews: ${nonprofit.reviews}
- Latest note: ${nonprofit.latestNote}

User direction:
${direction}

Return this exact JSON shape:
{
  "campaignTitle": "",
  "tone": "",
  "targetAudience": "",
  "callToAction": "",
  "totalDurationSeconds": 30,
  "visualStyle": "",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 8,
      "purpose": "Hook",
      "voiceover": "",
      "onscreenText": "",
      "visualPrompt": "",
      "transitionNote": ""
    }
  ]
}`;
}

function parseCampaignPlanResponse(raw: string): PartialCampaignPlan | null {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!candidate) {
    return null;
  }

  try {
    return JSON.parse(candidate) as PartialCampaignPlan;
  } catch {
    return null;
  }
}

function normalizeCampaignPlan(
  parsed: PartialCampaignPlan,
  nonprofit: NonprofitContext,
  userPrompt?: string,
): CampaignVideoPlan {
  const fallback = buildFallbackCampaignPlan(nonprofit, userPrompt);
  const safeScenes = Array.isArray(parsed.scenes)
    ? parsed.scenes
        .slice(0, 4)
        .map((scene, index) =>
          normalizePlanScene(scene, index + 1, fallback.scenes[index]),
        )
        .filter(Boolean) as ScenePlan[]
    : [];

  const scenes = safeScenes.length === fallback.scenes.length ? safeScenes : fallback.scenes;
  const totalDurationSeconds = scenes.reduce(
    (sum, scene) => sum + scene.durationSeconds,
    0,
  );

  return {
    campaignTitle: parsed.campaignTitle?.trim() || fallback.campaignTitle,
    tone: parsed.tone?.trim() || fallback.tone,
    targetAudience: parsed.targetAudience?.trim() || fallback.targetAudience,
    callToAction: parsed.callToAction?.trim() || fallback.callToAction,
    totalDurationSeconds:
      totalDurationSeconds >= 28 && totalDurationSeconds <= 32
        ? totalDurationSeconds
        : fallback.totalDurationSeconds,
    visualStyle: parsed.visualStyle?.trim() || fallback.visualStyle,
    scenes,
  };
}

function normalizePlanScene(
  scene: Partial<ScenePlan>,
  sceneNumber: number,
  fallback: ScenePlan,
): ScenePlan {
  const rawDuration =
    typeof scene.durationSeconds === "number" &&
    scene.durationSeconds >= 4 &&
    scene.durationSeconds <= 8
      ? Math.round(scene.durationSeconds)
      : fallback.durationSeconds;
  const duration =
    rawDuration >= 8 ? 8 : rawDuration >= 6 ? 6 : fallback.durationSeconds;

  return {
    sceneNumber,
    durationSeconds: duration,
    purpose: scene.purpose?.trim() || fallback.purpose,
    voiceover: scene.voiceover?.trim() || fallback.voiceover,
    onscreenText: scene.onscreenText?.trim() || fallback.onscreenText,
    visualPrompt: scene.visualPrompt?.trim() || fallback.visualPrompt,
    transitionNote: scene.transitionNote?.trim() || fallback.transitionNote,
  };
}

function summarizeConcept(plan: CampaignVideoPlan, nonprofit: NonprofitContext) {
  const scenePurposes = plan.scenes.map((scene) => scene.purpose.toLowerCase()).join(", ");
  return `A ${plan.totalDurationSeconds}-second vertical volunteer recruitment reel for ${plan.targetAudience.toLowerCase()} that moves through ${scenePurposes} while staying rooted in ${nonprofit.name}'s mission and current needs.`;
}

function inferTone(direction: string | undefined, nonprofit: NonprofitContext) {
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
  if (nonprofit.urgencyScore >= 90) {
    return "Urgent but hopeful";
  }
  return "Supportive, motivating, polished";
}

function inferAudience(direction: string | undefined, nonprofit: NonprofitContext) {
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

function inferVisualStyle(direction: string | undefined, nonprofit: NonprofitContext) {
  const normalized = direction?.toLowerCase() ?? "";

  if (normalized.includes("social") || normalized.includes("fast")) {
    return "Quick-cut vertical-video energy with bold captions and high-contrast nonprofit branding";
  }
  if (normalized.includes("emotional")) {
    return "Warm documentary-style visuals with close human details and soft motion graphics";
  }
  return `Clean, modern nonprofit storytelling with ${nonprofit.city} location texture and bold callout text`;
}
