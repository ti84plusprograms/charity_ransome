import type { Metadata } from "next";
import "./globals.css";
import { CoachWrapper } from "@/components/CoachWrapper";

export const metadata: Metadata = {
  title: "Volunteer Compliance Portal",
  description:
    "A satirical volunteer intake portal for browsing nonprofits, onboarding into missions, and capturing opt-in profile media.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white font-sans antialiased">
        <CoachWrapper>{children}</CoachWrapper>
      </body>
    </html>
  );
}
