import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "CREW | WHITE LIGHT STUDIO",
    description: "화이트라이트 스튜디오의 프로듀서, 엔지니어, 크루 소개",
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
    return children;
}
