import { NextResponse } from "next/server";
import { getVideoJobStatus } from "@/lib/video-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getVideoJobStatus(jobId);

  if (!job) {
    return NextResponse.json({ error: "Video job not found." }, { status: 404 });
  }

  return NextResponse.json(job, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
