import { publicPageMetadata, PUBLIC_SECTIONS } from "@/lib/public-metadata";

export const metadata = publicPageMetadata(PUBLIC_SECTIONS.class);

export default function ClassLayout({ children }: { children: React.ReactNode }) {
    return children;
}
