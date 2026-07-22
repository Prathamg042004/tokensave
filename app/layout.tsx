import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "TokenSave — Cut Your AI API Costs by up to 40%",
  description: "TokenSave is an intelligent middleware that reduces your Claude, GPT, Gemini, and Groq API bills through smart caching, model routing, and prompt compression.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${space.variable} antialiased`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}