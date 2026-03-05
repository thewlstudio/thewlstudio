import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "First Letter",
    description: "First Letter - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function FirstLetterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
