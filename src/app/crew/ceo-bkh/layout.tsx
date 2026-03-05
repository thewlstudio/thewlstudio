import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Baek Kwang-heum",
    description: "백광흠 - WHITE LIGHT STUDIO 대표 / CEO",
};

export default function CeoBkhLayout({ children }: { children: React.ReactNode }) {
    return children;
}
