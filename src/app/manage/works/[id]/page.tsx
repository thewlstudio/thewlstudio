import { notFound, redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import WorkForm, { type WorkFormData } from "./WorkForm";
import DeleteWorkButton from "./DeleteWorkButton";
import RestoreButton from "../../_components/RestoreButton";
import { restoreWork } from "../actions";
import ManageNav from "../../ManageNav";
import UpdatedAt from "../../_components/UpdatedAt";

export const metadata = { title: "작업물 수정" };
export const dynamic = "force-dynamic";

const detailQuery = `*[_type == "work" && _id == $id][0]{
    _id, _updatedAt, trashed, title, artist, "slug": slug.current, releaseDate,
    youtubeUrl, instagramId, instagramUrl,
    "imageUrl": coverImage.asset->url,
    contentBlocks[]{
        ...,
        _type == "imageBlock" => { ..., "imageUrl": image.asset->url },
        _type == "audioBlock" => { ..., "audioUrl": audioFile.asset->url }
    }
}`;

type Raw = {
    _id?: string;
    trashed?: boolean;
    title?: string;
    artist?: string;
    slug?: string;
    releaseDate?: string;
    youtubeUrl?: string;
    instagramId?: string;
    instagramUrl?: string;
    imageUrl?: string;
    contentBlocks?: unknown[];
};

/** 저장돼 있는 "YYYY. MM. DD." → 달력 입력용 "YYYY-MM-DD" (형식이 다르면 빈 값) */
function toIsoDate(s: string | undefined): string {
    const m = /^(\d{4})\. (\d{2})\. (\d{2})\.$/.exec(s ?? "");
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

export default async function EditWorkPage({ params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { id } = await params;
    const raw = await client.fetch<Raw | null>(detailQuery, { id: decodeURIComponent(id) });
    if (!raw?._id) notFound();

    const writeReady = isWriteConfigured();
    const isTrashed = raw.trashed === true;

    const data: WorkFormData = {
        _id: raw._id,
        title: raw.title ?? "",
        artist: raw.artist ?? "",
        slug: raw.slug ?? "",
        releaseDate: toIsoDate(raw.releaseDate),
        imageUrl: raw.imageUrl ?? null,
        youtubeUrl: raw.youtubeUrl ?? "",
        instagramId: raw.instagramId ?? "",
        instagramUrl: raw.instagramUrl ?? "",
        blocks: raw.contentBlocks ?? [],
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="작업물 수정" />

            <div className="mb-6 space-y-3">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{data.title || "제목 없음"}</h2>
                    <UpdatedAt iso={(raw as { _updatedAt?: string })._updatedAt} />
                </div>

                {isTrashed ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-800 mb-3">이 작업물은 휴지통에 있어요. 사이트와 목록에 보이지 않아요.</p>
                        {writeReady && <RestoreButton documentId={data._id} restore={restoreWork} />}
                    </div>
                ) : (
                    <DeleteWorkButton documentId={data._id} workTitle={data.title} />
                )}
            </div>

            <WorkForm data={data} mode="edit" />
        </main>
    );
}
