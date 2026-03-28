import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const { contactEmail, emailBody, memeImage } = await req.json();

    if (!contactEmail || !emailBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const attachments = [];
    if (memeImage) {
      // Clean the base64 string for Resend
      const base64Data = memeImage.split(",")[1];
      attachments.push({
        filename: "shame_flyer.jpg",
        content: base64Data,
      });
    }

    const data = await resend.emails.send({
      from: "The Aggressive Recruiter <onboarding@resend.dev>", // Update this if you have a verified domain
      to: [contactEmail],
      subject: "A Disappointing Update Regarding Your Contact",
      html: `<p>${emailBody.replace(/\n/g, "<br>")}</p>`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (data?.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = typeof (data.error as any).statusCode === "number" ? (data.error as any).statusCode : 502;
      return NextResponse.json({ success: false, error: data.error.message ?? "Failed to send email" }, { status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to send shame payload:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
