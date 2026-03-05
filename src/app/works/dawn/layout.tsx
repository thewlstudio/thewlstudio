import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "새벽의 틈",
    description: "새벽의 틈 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function DawnLayout({ children }: { children: React.ReactNode }) {
    return children;
}
