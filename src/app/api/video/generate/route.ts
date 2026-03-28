import { NextResponse } from "next/server";
import {
  buildNonprofitContext,
  type NonprofitContext,
  type VideoGenerationRequest,
} from "@/lib/campaign";
import { getMissionBriefById } from "@/lib/nonprofit-details";
import {
  createVideoJob,
  getDefaultVideoRenderMode,
  kickoffVideoGenerationJob,
} from "@/lib/video-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<VideoGenerationRequest>;
  const nonprofitId = body.nonprofitId ?? body.nonprofitContext?.id;

  if (!nonprofitId) {
    return NextResponse.json(
      { error: "A nonprofit id is required to generate a campaign video." },
      { status: 400 },
    );
  }

  const resolvedNonProfit = await getMissionBriefById(nonprofitId);
  const nonprofitContext: NonprofitContext | undefined = resolvedNonProfit
    ? buildNonprofitContext(resolvedNonProfit)
    : body.nonprofitContext;

  if (!nonprofitContext) {
    return NextResponse.json(
      { error: "Nonprofit context was not found for the requested campaign." },
      { status: 404 },
    );
  }

  const requestedMode = body.preferredMode ?? getDefaultVideoRenderMode();
  const job = createVideoJob({ requestedMode });
  const requestPayload: VideoGenerationRequest = {
    nonprofitId,
    nonprofitContext,
    optionalPrompt: body.optionalPrompt?.trim() || undefined,
    preferredMode: requestedMode,
  };

  // Keep the demo queue local and explicit so job progress starts immediately
  // during development instead of depending on `after()` background semantics.
  kickoffVideoGenerationJob(job.jobId, requestPayload);

  return NextResponse.json(
    { jobId: job.jobId, requestedMode },
    { headers: { "Cache-Control": "no-store" } },
  );
}
