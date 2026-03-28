import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { getMissionBriefById } from "@/lib/nonprofit-details";
import { CampaignStudioClient } from "./CampaignStudioClient";

export default async function NonProfitCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nonProfit = await getMissionBriefById(id);

  if (!nonProfit) {
    notFound();
  }

  const latestGeneratedClipUrl = await getLatestGeneratedClipUrl();

  return (
    <CampaignStudioClient
      initialNonProfit={nonProfit}
      latestGeneratedClipUrl={latestGeneratedClipUrl}
    />
  );
}

async function getLatestGeneratedClipUrl() {
  const jobsDirectory = path.join(process.cwd(), "public", "generated", "jobs");

  try {
    const entries = await readdir(jobsDirectory, { withFileTypes: true });
    const clips = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const clipPath = path.join(jobsDirectory, entry.name, "scene-1.mp4");

          try {
            const clipStats = await stat(clipPath);

            return {
              updatedAtMs: clipStats.mtimeMs,
              url: `/generated/jobs/${entry.name}/scene-1.mp4`,
            };
          } catch {
            return null;
          }
        }),
    );

    const latestClip = clips
      .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip))
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs)[0];

    return latestClip?.url ?? null;
  } catch {
    return null;
  }
}
