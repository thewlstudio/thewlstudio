import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Scon",
    description: "민수(Scon) - WHITE LIGHT STUDIO 보컬 디렉터 / Producer · Vocal Director",
};

export default function VocalSconLayout({ children }: { children: React.ReactNode }) {
    return children;
}
