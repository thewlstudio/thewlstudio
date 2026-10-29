import Link from "../../../_components/GuardedLink";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import { getWriteClient, isWriteConfigured } from "@/sanity/lib/writeClient";
import { buildHistoryRows, buildRestoredDoc, changedKeys, docAt, HISTORY_AREAS, historyValue, isHistoryArea, isHistoryDocument, isHistoryDocumentId, listRevisions, summarizeValue } from "@/lib/manage-history";
import { formatAbsolute, formatUpdated } from "@/lib/format-updated";
import ManageNav from "../../../ManageNav";
import RestoreRevisionButton from "../../RestoreRevisionButton";

export const metadata = { title: "변경 이력" };
export const dynamic = "force-dynamic";

type Doc = Record<string, unknown>;

function Shell({ back, title, children }: { back: string; title: string; children: React.ReactNode }) {
    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="변경 이력" />
            <Link href={back} className="inline-block mb-4 py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                ← {title} 수정 화면으로
            </Link>
            {children}
        </main>
    );
}

export default async function HistoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ area: string; id: string }>;
    searchParams: Promise<{ at?: string }>;
}) {
    if (!(await isAuthenticated())) redirect("/manage/login");
    const { area, id: rawId } = await params;
    const { at } = await searchParams;
    if (!isHistoryArea(area)) notFound();
    const cfg = HISTORY_AREAS[area];
    const id = rawId;
    if (!isHistoryDocumentId(id)) notFound();
    if (cfg.fixedId && cfg.fixedId !== id) notFound();

    const back = cfg.back(id);
    const label = (k: string) => Object.hasOwn(cfg.labels, k) ? cfg.labels[k] : k;

    if (!isWriteConfigured()) {
        return (
            <Shell back={back} title={cfg.title}>
                <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed">
                    <p className="font-bold mb-1">이력을 불러오려면 저장 기능 설정이 필요해요</p>
                    <p className="text-neutral-700">
                        개발자에게 <code className="bg-white/70 px-1 rounded">SANITY_API_WRITE_TOKEN</code> 설정을 요청해 주세요.
                    </p>
                </div>
            </Shell>
        );
    }

    const sanity = getWriteClient();
    let revisions;
    let current;
    try {
        // 한 건을 더 읽어 25번째 항목도 바로 이전 기록과 비교한다.
        [revisions, current] = await Promise.all([listRevisions(sanity, id, 26), sanity.getDocument<Doc>(id)]);
    } catch (err) {
        console.error("[history]", err);
        return (
            <Shell back={back} title={cfg.title}>
                <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm leading-relaxed">
                    <p className="font-bold text-red-700 mb-1">이력을 불러오지 못했어요</p>
                    <p className="text-red-700">잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요.</p>
                </div>
            </Shell>
        );
    }
    if (!isHistoryDocument(current, id, cfg.type)) notFound();
    if (revisions.length === 0) return (
        <Shell back={back} title={cfg.title}>
            <p role="status" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-relaxed">확인할 수 있는 저장 기록이 없어요. 보관 기간이나 이력 접근 권한에 따라 기록이 보이지 않을 수 있어요. 현재 내용은 수정 화면에서 확인할 수 있어요.</p>
        </Shell>
    );

    // 각 저장 시점의 내용을 한꺼번에 읽어서, 바로 이전 저장과 비교해 "무엇이 바뀌었는지" 계산한다
    const docs = await Promise.all(revisions.map(async (r) => {
        const doc = await docAt(sanity, id, r.timestamp).catch(() => null);
        return isHistoryDocument(doc, id, cfg.type) ? doc : null;
    }));
    const rows = buildHistoryRows(revisions, docs);

    const selected = at ? rows.find((r) => r.timestamp === at) : undefined;
    const comparisonText = (row: typeof rows[number]) => {
        if (row.comparison === "created") return "항목을 새로 만든 기록이에요.";
        if (row.comparison === "boundary") return "이전 기록이 없어 변경 내용을 비교할 수 없어요.";
        if (row.comparison === "unavailable") return "기록 내용을 읽지 못해 변경 내용을 비교할 수 없어요.";
        return row.keys.length === 0 ? "눈에 보이는 내용 변경 없음" : `바뀐 항목: ${row.keys.slice(0, 5).map(label).join(", ")}${row.keys.length > 5 ? ` 외 ${row.keys.length - 5}개` : ""}`;
    };

    return (
        <Shell back={back} title={cfg.title}>
            <div className="mb-5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{cfg.title} 변경 이력</h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                    저장할 때마다 기록돼요. 이전 상태를 확인하고 되돌릴 수 있고, 되돌린 뒤의 상태도 이력에 남아서 다시 되돌릴 수 있어요. 이력은 Sanity 요금제에 따라 일정 기간만 보관돼요.
                </p>
            </div>

            {at && !selected && <p role="status" className="mb-6 text-sm text-amber-800">선택한 기록을 찾지 못했어요. 아래 목록에서 다시 골라 주세요.</p>}
            {selected && (
                <section aria-labelledby="detail" className="mb-6 rounded-2xl border-2 border-black bg-white p-5">
                    <h3 id="detail" className="text-base font-black mb-1">{formatAbsolute(selected.timestamp)}의 저장</h3>
                    <p className="text-sm text-neutral-600 mb-3">{comparisonText(selected)}</p>

                    {selected.comparison === "available" && (
                        <ul className="space-y-2 mb-4">
                            {selected.keys.length === 0 && <li className="text-sm text-neutral-500">눈에 보이는 내용 변경은 없어요.</li>}
                            {selected.keys.map((k) => (
                                <li key={k} className="text-sm leading-relaxed">
                                    <span className="font-bold">{label(k)}</span>
                                    <span className="text-neutral-600">: {summarizeValue(historyValue(selected.prev, k))} → {summarizeValue(historyValue(selected.doc, k))}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!selected.doc ? (
                        <p role="alert" className="text-sm font-semibold text-amber-800">이 시점의 내용을 확인할 수 없어 되돌리기는 잠시 막아 두었어요. 보관 기간이 지났거나 읽지 못했을 수 있어요. 화면을 새로고침하거나 다른 기록을 골라 주세요.</p>
                    ) : selected.doc._rev !== current._rev ? (
                        <>
                            <div className="rounded-xl bg-neutral-100 p-4 mb-4">
                                <p className="text-sm font-bold mb-2">이 시점으로 되돌리면 지금과 달라지는 내용</p>
                                {(() => {
                                    const restored = buildRestoredDoc(selected.doc, current);
                                    const diff = changedKeys(current, restored);
                                    return diff.length === 0 ? (
                                        <p className="text-sm text-neutral-600">지금과 같은 내용이에요.</p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {diff.map((k) => (
                                                <li key={k} className="text-sm leading-relaxed">
                                                    <span className="font-bold">{label(k)}</span>
                                                    <span className="text-neutral-600">: 지금 {summarizeValue(historyValue(current, k))} → 되돌리면 {summarizeValue(historyValue(restored, k))}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                })()}
                                <p className="text-xs text-neutral-500 mt-3">휴지통 상태와 순서는 지금 그대로 유지돼요.</p>
                            </div>
                            <RestoreRevisionButton area={area} documentId={id} time={selected.timestamp} expectedRevision={current._rev} backHref={back} />
                        </>
                    ) : (
                        <p className="text-sm font-semibold text-neutral-700">지금 저장된 내용과 같은 기록이에요.</p>
                    )}
                </section>
            )}

            <ol data-tour="history-list" className="space-y-2">
                {rows.map((r, i) => {
                    const rel = formatUpdated(r.timestamp);
                    const active = r.timestamp === at;
                    return (
                        <li key={r.id}>
                            <Link
                                href={`/manage/history/${area}/${encodeURIComponent(id)}?at=${encodeURIComponent(r.timestamp)}`}
                                aria-current={active ? "true" : undefined}
                                className={`block rounded-xl border p-4 bg-white hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${active ? "border-black" : "border-neutral-200"}`}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <time dateTime={r.timestamp} className="text-sm font-bold">{formatAbsolute(r.timestamp)}</time>
                                    {rel && <span className="text-sm text-neutral-500">({rel.replace(" 수정", "")})</span>}
                                    {(r.doc?._rev === current._rev || i === 0) && <span className="text-[10px] font-bold text-white bg-black px-1.5 py-0.5 rounded">{r.doc?._rev === current._rev ? "현재" : "최근 기록"}</span>}
                                </div>
                                <p className="text-sm text-neutral-600 mt-1 break-keep">
                                    {comparisonText(r)}
                                </p>
                            </Link>
                        </li>
                    );
                })}
            </ol>
            {revisions.length > 25 && <p className="text-sm text-neutral-500 mt-4">최근 25번의 저장만 보여줘요.</p>}
        </Shell>
    );
}
