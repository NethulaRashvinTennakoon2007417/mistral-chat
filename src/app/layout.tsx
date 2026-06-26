import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mistral Chat - Free AI Assistant",
  description: "A free AI chat interface powered by Mistral AI. Chat with multiple Mistral models including Mistral Tiny, Small, Medium, and Large.",
  keywords: ["Mistral AI", "Chat", "AI Assistant", "Free AI", "Mistral Chat"],
  authors: [{ name: "Mistral Chat" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
