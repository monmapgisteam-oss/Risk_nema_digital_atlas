import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Эрсдэлийн дижитал атлас — ОБЕГ",
  description:
    "Аюулт үзэгдэл, эмзэг байдал ба өртөх байдлын газрын зургийн атлас",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
