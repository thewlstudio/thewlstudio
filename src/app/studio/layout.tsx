import { publicPageMetadata, PUBLIC_SECTIONS } from "@/lib/public-metadata";

export const metadata = publicPageMetadata(PUBLIC_SECTIONS.studio);

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    return children;
}
