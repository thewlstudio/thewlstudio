import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "가면",
    description: "가면 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function MaskLayout({ children }: { children: React.ReactNode }) {
    return children;
}
