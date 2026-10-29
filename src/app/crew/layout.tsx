import { publicPageMetadata, PUBLIC_SECTIONS } from "@/lib/public-metadata";

export const metadata = publicPageMetadata(PUBLIC_SECTIONS.crew);

export default function CrewLayout({ children }: { children: React.ReactNode }) {
    return children;
}
