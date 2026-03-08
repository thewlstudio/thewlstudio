import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Preloader from "@/components/Preloader";
import SmoothScroll from "@/components/SmoothScroll";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewlstudio.com"),
  title: {
    default: "WHITE LIGHT STUDIO",
    template: "%s | WHITE LIGHT STUDIO",
  },
  description: "서울 광진구 중곡동의 보컬 연습 스튜디오 - 화이트라이트 스튜디오. 7호선 중곡역 3번 출구.",
  icons: {
    icon: "/images/studio_logo.jpg",
    apple: "/images/studio_logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://thewlstudio.com",
    siteName: "WHITE LIGHT STUDIO",
    title: "WHITE LIGHT STUDIO",
    description: "서울 광진구 중곡동의 보컬 연습 스튜디오 - 화이트라이트 스튜디오. 7호선 중곡역 3번 출구.",
    images: [{ url: "/images/studio_logo.jpg", width: 1200, height: 630, alt: "WHITE LIGHT STUDIO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WHITE LIGHT STUDIO",
    description: "서울 광진구 중곡동의 보컬 연습 스튜디오 - 화이트라이트 스튜디오. 7호선 중곡역 3번 출구.",
    images: ["/images/studio_logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} ${pretendard.className} min-h-screen bg-black text-white selection:bg-white selection:text-black`}>
        <Preloader />
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
