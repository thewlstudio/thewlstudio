import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "WORKS",
    description: "화이트라이트 스튜디오에서 제작된 음악 작업물 포트폴리오",
    alternates: { canonical: "/works" },
};

export default function WorksLayout({ children }: { children: React.ReactNode }) {
    return children;
}
