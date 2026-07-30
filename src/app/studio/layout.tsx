import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "STUDIO",
    description: "화이트라이트 스튜디오 연습실 안내 - A, B, C, D Room 시설 및 가격 정보",
    alternates: { canonical: "/studio" },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    return children;
}
