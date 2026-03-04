import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WHITE LIGHT STUDIO",
  description: "Recording Music Studio - 7호선 중곡역 exit 3",
  icons: {
    icon: "/images/studio_logo.jpg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-black text-white selection:bg-white selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
