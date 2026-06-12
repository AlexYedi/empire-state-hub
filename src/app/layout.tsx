import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { DEFAULT_LENS, isLens, LENS_COOKIE, type Lens } from "@/lib/lens";
import { LensProvider } from "@/components/lens-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Empire State — NYC AI field notes & the system behind them",
  description:
    "A documentarian's account of New York's AI rooms, and the multi-agent pipeline that turns each event into research and content. Read it as a story, or see how it's built.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const cookieLens = store.get(LENS_COOKIE)?.value;
  const lens: Lens = isLens(cookieLens) ? cookieLens : DEFAULT_LENS;

  return (
    <html
      lang="en"
      data-lens={lens}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LensProvider initialLens={lens}>{children}</LensProvider>
      </body>
    </html>
  );
}
