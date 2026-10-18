import { notFound, redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../../ManageNav";
import RestoreButton from "../RestoreButton";
import CrewForm, { type CrewFormData } from "./CrewForm";
import DeleteCrewButton from "./DeleteCrewButton";

export const metadata = { title: "크루 수정" };
export const dynamic = "force-dynamic";

const detailQuery = `*[_type == "crew" && _id == $id][0]{
    _id, isActive, trashed, name, koName, role,
    "slug": slug.current,
    "imageUrl": image.asset->url,
    "links": links[]{ _key, url, "iconRef": iconImage.asset._ref }
}`;

type Raw = {
    _id?: string;
    isActive?: boolean;
    trashed?: boolean;
    name?: string;
    koName?: string;
    role?: string;
    slug?: string;
    imageUrl?: string | null;
    links?: Array<{ _key?: string; url?: string; iconRef?: string }> | null;
};

export default async function EditCrewPage({ params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { id } = await params;
    const raw = await client.fetch<Raw | null>(detailQuery, { id: decodeURIComponent(id) });
    if (!raw?._id) notFound();

    const writeReady = isWriteConfigured();
    const isTrashed = raw.trashed === true;

    const data: CrewFormData = {
        _id: raw._id,
        // 기존 데이터에 이 필드가 없을 수 있다 — 그 경우 "공개"로 취급
        isActive: raw.isActive ?? true,
        name: raw.name ?? "",
        koName: raw.koName ?? "",
        role: raw.role ?? "",
        slug: raw.slug ?? "",
        imageUrl: raw.imageUrl ?? null,
        links: (raw.links ?? []).map((l, i) => ({
            key: l._key ?? `legacy-${i}`,
            url: l.url ?? "",
            iconRef: l.iconRef ?? "",
        })),
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="크루 수정" />

            <div className="mb-6 space-y-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">크루 수정</p>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{data.koName || data.name || "이름 없음"}</h2>
                </div>
                {isTrashed ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-800 mb-3">이 크루는 휴지통에 있습니다. 사이트와 목록에 보이지 않습니다.</p>
                        {writeReady && <RestoreButton documentId={data._id} />}
                    </div>
                ) : (
                    <DeleteCrewButton documentId={data._id} memberName={data.koName || data.name} />
                )}
            </div>

            <CrewForm data={data} mode="edit" />
        </main>
    );
}
