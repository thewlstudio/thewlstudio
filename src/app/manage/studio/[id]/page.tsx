import { notFound, redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import SpaceForm, { type SpaceFormData } from "./SpaceForm";
import DeleteSpaceButton from "./DeleteSpaceButton";
import RestoreButton from "../../_components/RestoreButton";
import { restoreSpace } from "../actions";
import ManageNav from "../../ManageNav";

export const metadata = { title: "공간 수정" };
export const dynamic = "force-dynamic";

const detailQuery = `*[_type == "studioSpace" && _id == $id][0]{
    _id, kind, trashed, isActive, name, subtitle, description, features, notes,
    "prices": prices[]{ _key, label, value, unit },
    "images": images[]{ _key, "url": asset->url }
}`;

type Raw = {
    _id?: string;
    kind?: string;
    trashed?: boolean;
    isActive?: boolean;
    name?: string;
    subtitle?: string;
    description?: string;
    features?: string[];
    notes?: string[];
    prices?: { _key?: string; label?: string; value?: string; unit?: string }[];
    images?: { _key?: string; url?: string }[];
};

export default async function EditSpacePage({ params }: { params: Promise<{ id: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { id } = await params;
    const raw = await client.fetch<Raw | null>(detailQuery, { id: decodeURIComponent(id) });
    if (!raw?._id) notFound();

    const writeReady = isWriteConfigured();
    const isTrashed = raw.trashed === true;

    const data: SpaceFormData = {
        _id: raw._id,
        kind: raw.kind === "lobby" ? "lobby" : "room",
        // 기존 데이터에는 이 필드가 없을 수 있다 — 그 경우 "공개"로 취급한다
        isActive: raw.isActive ?? true,
        name: raw.name ?? "",
        subtitle: raw.subtitle ?? "",
        description: raw.description ?? "",
        prices: (raw.prices ?? []).map((p, i) => ({ key: p._key ?? `p-${i}`, label: p.label ?? "", value: p.value ?? "", unit: p.unit ?? "" })),
        features: raw.features ?? [],
        notes: raw.notes ?? [],
        images: (raw.images ?? []).filter((im) => im.url).map((im, i) => ({ key: im._key ?? `img-${i}`, url: im.url as string })),
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="공간 수정" />

            <div className="mb-6 space-y-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">{data.kind === "lobby" ? "로비 수정" : "연습실 수정"}</p>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{data.name || "이름 없음"}</h2>
                </div>

                {isTrashed ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-800 mb-3">이 공간은 휴지통에 있어요. 사이트와 목록에 보이지 않아요.</p>
                        {writeReady && <RestoreButton documentId={data._id} restore={restoreSpace} />}
                    </div>
                ) : (
                    <DeleteSpaceButton documentId={data._id} spaceName={data.name} />
                )}
            </div>

            <SpaceForm data={data} mode="edit" />
        </main>
    );
}
