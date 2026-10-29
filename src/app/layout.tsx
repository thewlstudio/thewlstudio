import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Preloader from "@/components/Preloader";
import SmoothScroll from "@/components/SmoothScroll";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { getSiteSettings } from "@/lib/site-settings-server";
import { serializeJsonLd } from "@/lib/json-ld";
import SkipLink from "@/components/SkipLink";
import PageNavigationFocus from "@/components/PageNavigationFocus";
import PreviewBanner from "@/components/PreviewBanner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_KO, getSiteUrl } from "@/config/site";
import { PUBLIC_SHARE_IMAGE } from "@/lib/public-metadata";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  icons: {
    icon: "/images/studio_logo.jpg",
    apple: "/images/studio_logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    // TODO: 지금은 실제 파일(정사각형 839x839) 크기를 그대로 선언만 해둔 상태.
    // summary_large_image(가로형)에는 맞지 않으니, 나중에 1200x630 전용
    // OG 이미지를 따로 제작하면 이 값과 twitter.card를 함께 교체할 것.
    images: [{ ...PUBLIC_SHARE_IMAGE }],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [PUBLIC_SHARE_IMAGE.url],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const baseUrl = getSiteUrl();
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} ${pretendard.className} min-h-screen bg-black text-white selection:bg-white selection:text-black`}>
        <SkipLink />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            alternateName: SITE_NAME_KO,
            url: baseUrl,
            logo: `${baseUrl}${PUBLIC_SHARE_IMAGE.url}`,
            description: SITE_DESCRIPTION,
            // 자유 입력 주소를 시·구로 추측 분할하지 않고 공개된 전체 주소를 전달한다.
            address: { "@type": "PostalAddress", streetAddress: settings.addressKo },
            telephone: settings.phone,
          }) }}
        />
        <SiteSettingsProvider value={settings}>
          <Preloader />
          <SmoothScroll>
            {children}
          </SmoothScroll>
          <PageNavigationFocus />
          <PreviewBanner />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
