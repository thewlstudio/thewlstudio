import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Oh Seung-hwan",
    description: "오승환 - WHITE LIGHT STUDIO 프로듀서 / Production · PA · Video Filming",
};

export default function ProdShcordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
