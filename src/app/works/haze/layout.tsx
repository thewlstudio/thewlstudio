import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "아지랑이",
    description: "아지랑이 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function HazeLayout({ children }: { children: React.ReactNode }) {
    return children;
}
