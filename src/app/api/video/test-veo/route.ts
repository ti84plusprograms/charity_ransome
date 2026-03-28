import { NextResponse } from "next/server";
import {
  runVeoSanityCheck,
  VideoGenerationTimeoutError,
  VeoGenerationError,
} from "@/lib/veo-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.ENABLE_VEO_TEST_ROUTE !== "1"
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const result = await runVeoSanityCheck();

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Veo sanity test failed.";
    const status =
      error instanceof VideoGenerationTimeoutError
        ? 504
        : error instanceof VeoGenerationError
          ? error.httpStatus ?? 500
          : 500;

    return NextResponse.json(
      {
        providerName: "Google Veo 3.1",
        error: message,
        internalStatus:
          error instanceof VeoGenerationError ? error.internalStatus : "failed_provider",
        providerStatus:
          error instanceof VeoGenerationError ? error.providerStatus : undefined,
        providerOperationId:
          error instanceof VeoGenerationError ? error.providerOperationId : undefined,
        lastHttpStatus:
          error instanceof VeoGenerationError ? error.httpStatus : undefined,
        lastProviderErrorCode:
          error instanceof VeoGenerationError ? error.providerErrorCode : undefined,
      },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
