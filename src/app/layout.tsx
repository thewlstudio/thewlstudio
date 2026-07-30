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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app"),
  title: {
    default: "WHITE LIGHT STUDIO",
    template: "%s | WHITE LIGHT STUDIO",
  },
  description: "서울 광진구 중곡동의 보컬 연습 스튜디오 - 화이트라이트 스튜디오. 7호선 중곡역 3번 출구.",
  alternates: { canonical: "/" },
  icons: {
    icon: "/images/studio_logo.jpg",
    apple: "/images/studio_logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app",
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          본문 바로가기
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "WHITE LIGHT STUDIO",
            alternateName: "화이트라이트 스튜디오",
            url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app",
            logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://whitelightstudio.vercel.app"}/images/studio_logo.jpg`,
            description: "서울 광진구 중곡동의 보컬 연습 스튜디오",
            address: {
              "@type": "PostalAddress",
              addressLocality: "서울특별시",
              addressRegion: "광진구",
              addressCountry: "KR",
            },
          }) }}
        />
        <Preloader />
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
