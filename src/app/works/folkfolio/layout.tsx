import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "오빠야 강변살자",
    description: "오빠야 강변살자 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function FolkfolioLayout({ children }: { children: React.ReactNode }) {
    return children;
}
