import { notFound, redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../../ManageNav";
import RestoreButton from "../../_components/RestoreButton";
import { restoreCrew } from "../actions";
import CrewForm, { type CrewFormData } from "./CrewForm";
import DeleteCrewButton from "./DeleteCrewButton";
import UpdatedAt from "../../_components/UpdatedAt";
import DetailReadFailure from "../../_components/DetailReadFailure";
import { detailReadIssue } from "@/lib/manage-detail-read";

export const metadata = { title: "크루 수정" };
export const dynamic = "force-dynamic";

const detailQuery = `*[_type == "crew" && _id == $id][0]{
    _id, _type, _rev, _updatedAt, isActive, trashed, name, koName, role,
    "slug": slug.current,
    "sourceSlug": slug,
    "imageUrl": image.asset->url,
    "links": links[]{ _key, url, "iconRef": iconImage.asset._ref },
    "sourceLinks": links,
    sections
}`;

type Raw = {
    _id?: string;
    _rev?: string;
    isActive?: boolean;
    trashed?: boolean;
    name?: string;
    koName?: string;
    role?: string;
    slug?: string;
    imageUrl?: string | null;
    links?: Array<{ _key?: string; url?: string; iconRef?: string }> | null;
    sections?: unknown[] | null;
};

export default async function EditCrewPage({ params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { id } = await params;
    const documentId = decodeURIComponent(id);
    const result = await client.fetch<unknown>(detailQuery, { id: documentId });
    if (result === null) notFound();
    const issue = detailReadIssue("crew", documentId, result);
    if (issue) return <DetailReadFailure title="크루 수정" fields={issue.fields} />;
    const raw = result as Raw & { _id: string };

    const writeReady = isWriteConfigured();
    const isTrashed = raw.trashed === true;

    const data: CrewFormData = {
        _id: raw._id,
        _rev: raw._rev,
        // 기존 데이터에 이 필드가 없을 수 있다 — 그 경우 "공개"로 취급
        isActive: raw.isActive ?? true,
        name: raw.name ?? "",
        koName: raw.koName ?? "",
        role: raw.role ?? "",
        slug: raw.slug ?? "",
        imageUrl: raw.imageUrl ?? null,
        links: (raw.links ?? []).map((l, i) => {
            const sourceKey = typeof l._key === "string" && l._key ? l._key : undefined;
            return { key: sourceKey ? `stored-${i}` : `legacy-${i}`, sourceKey, url: l.url ?? "", iconRef: l.iconRef ?? "" };
        }),
        sections: raw.sections ?? [],
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="크루 수정" />

            <div className="mb-6 space-y-3">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{data.koName || data.name || "이름 없음"}</h2>
                    <UpdatedAt iso={(raw as { _updatedAt?: string })._updatedAt} historyHref={`/manage/history/crew/${raw._id}`} />
                </div>
                {isTrashed ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-800 mb-3">이 크루는 휴지통에 있어요. 사이트와 목록에 보이지 않아요.</p>
                        {writeReady && <RestoreButton documentId={data._id} restore={restoreCrew} />}
                    </div>
                ) : (
                    <DeleteCrewButton documentId={data._id} memberName={data.koName || data.name} />
                )}
            </div>

            <CrewForm data={data} mode="edit" />
        </main>
    );
}
