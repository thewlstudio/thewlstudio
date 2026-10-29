import { publicPageMetadata, PUBLIC_SECTIONS } from "@/lib/public-metadata";

export const metadata = publicPageMetadata(PUBLIC_SECTIONS.works);

export default function WorksLayout({ children }: { children: React.ReactNode }) {
    return children;
}
