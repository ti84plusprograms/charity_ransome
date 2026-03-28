import type { Metadata } from "next";
import "./globals.css";
import { CoachWrapper } from "@/components/CoachWrapper";

export const metadata: Metadata = {
  title: "The Aggressive Recruiter | Satirical Charity Volunteering",
  description:
    "A satirical app that uses AI roast-style humor to recruit volunteers for local non-profits. All camera access is opt-in for marketing asset creation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen font-sans">
        <CoachWrapper>{children}</CoachWrapper>
      </body>
    </html>
  );
}
