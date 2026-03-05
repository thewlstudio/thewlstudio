import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "사랑의 형태",
    description: "사랑의 형태 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function WithYouLayout({ children }: { children: React.ReactNode }) {
    return children;
}
