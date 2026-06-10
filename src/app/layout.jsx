import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import AuthModal from "../components/AuthModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TravelFun 🧭 社群共享版行程規劃助手",
  description: "個人私密編輯與社群公開分享的一站式行程助手。一鍵複製精彩行程，支援二級地區篩選與地圖路線規劃！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-[#f1f5f9]">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
          {children}
        </main>
        <AuthModal />
      </body>
    </html>
  );
}
