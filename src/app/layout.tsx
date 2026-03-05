import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WHITE LIGHT STUDIO",
  description: "Recording Music Studio - 7호선 중곡역 exit 3",
  icons: {
    icon: "/images/studio_logo.jpg",
    apple: "/images/studio_logo.jpg",
  },
  openGraph: {
    title: "WHITE LIGHT STUDIO",
    description: "Recording Music Studio - 7호선 중곡역 exit 3",
    url: "https://whitelightstudio.vercel.app", // Ensure this matches your actual production URL later
    siteName: "WHITE LIGHT STUDIO",
    images: [
      {
        url: "/images/studio_logo_2.png", // Or "/images/studio_logo.jpg"
        width: 1200,
        height: 630,
        alt: "WHITE LIGHT STUDIO Logo",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WHITE LIGHT STUDIO",
    description: "Recording Music Studio - 7호선 중곡역 exit 3",
    images: ["/images/studio_logo_2.png"],
  },
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
