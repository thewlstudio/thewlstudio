import WorksClient from "./WorksClient";
import type { Metadata } from "next";
import { getPublicWorks } from "./data";
import { worksPage, worksPageHref, worksQueryString, type WorksSearchParams } from "@/lib/works-pagination";
import { publicPageMetadata, PUBLIC_SECTIONS } from "@/lib/public-metadata";

type Props = { searchParams: Promise<WorksSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const [query, works] = await Promise.all([searchParams, getPublicWorks()]);
    const { page } = worksPage(query.page, works.length);
    return publicPageMetadata({ ...PUBLIC_SECTIONS.works, path: worksPageHref("", page) });
}

export default async function WorksIndexPage({ searchParams }: Props) {
    const [query, works] = await Promise.all([searchParams, getPublicWorks()]);
    const { page } = worksPage(query.page, works.length);
    return <WorksClient initialWorks={works} currentPage={page} query={worksQueryString(query)} />;
}
