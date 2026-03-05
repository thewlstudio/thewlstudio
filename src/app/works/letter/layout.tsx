import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "글(Letter)",
    description: "글(Letter) - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function LetterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
