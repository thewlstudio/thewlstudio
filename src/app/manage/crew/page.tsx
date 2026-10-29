import Link from "../_components/GuardedLink";
import Image from "@/components/CmsImage";
import { redirect } from "next/navigation";
import { CONTENT_ORDER } from "@/lib/content-order";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../ManageNav";
import ReorderButtons from "../_components/ReorderButtons";
import ManagedList, { DragHandle } from "../_components/ManagedList";
import RestoreButton from "../_components/RestoreButton";
import { moveCrewOrder, restoreCrew, reorderCrew } from "./actions";
import { listReadIssue } from "@/lib/manage-list-read";
import { manageThumbnail } from "@/lib/manage-thumbnail";
import ListReadFailure from "../_components/ListReadFailure";
import { formatUpdated, formatAbsolute } from "@/lib/format-updated";
import EmptyState from "../_components/EmptyState";

export const metadata = { title: "크루 관리" };
export const dynamic = "force-dynamic";

type Row = { _id: string; _updatedAt?: string; name?: string; koName?: string; role?: string; image?: unknown; isActive?: boolean };

const listQuery = `*[_type == "crew" && !(trashed == true)] | order(${CONTENT_ORDER}) { _id, _type, _updatedAt, name, koName, role, image, isActive, trashed, order }`;
const trashedQuery = `*[_type == "crew" && trashed == true] | order(_updatedAt desc) { _id, _type, _updatedAt, name, koName, role, image, isActive, trashed, order }`;

export default async function CrewListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { view } = await searchParams;
    const isTrashView = view === "trash";
    const writeReady = isWriteConfigured();

    const [result, countResult] = await Promise.all([
        client.fetch<unknown>(isTrashView ? trashedQuery : listQuery),
        isTrashView ? Promise.resolve(0) : client.fetch<unknown>(`count(*[_type == "crew" && trashed == true])`),
    ]);
    const issue = listReadIssue("crew", result, countResult, isTrashView);
    if (issue) return <ListReadFailure title={isTrashView ? "크루 휴지통" : "크루 관리"} fields={issue.fields} />;
    const members = result as Row[];
    const trashedCount = countResult as number;

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title={isTrashView ? "크루 휴지통" : "크루 관리"} />

            {!writeReady && (
                <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed">
                    <p className="font-bold mb-1">아직 저장 기능이 켜지지 않았어요</p>
                    <p className="text-neutral-700">
                        내용은 볼 수 있지만, 저장하려면 Sanity 쓰기 토큰 설정이 필요해요. 개발자에게{" "}
                        <code className="bg-white/70 px-1 rounded">SANITY_API_WRITE_TOKEN</code> 설정을 요청해 주세요.
                    </p>
                </div>
            )}

            {isTrashView ? (
                <>
                    <p className="text-sm text-neutral-600 mb-4">
                        삭제된 크루 {members.length}명. 복원하면 기존 목록에 원래 순서 그대로 다시 나타나요.
                    </p>
                    <Link href="/manage/crew" className="inline-block mb-4 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4">
                        ← 크루 목록으로
                    </Link>
                </>
            ) : (
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-sm text-neutral-600">수정할 크루를 눌러 주세요. 총 {members.length}명이 등록되어 있어요.</p>
                    {writeReady && (
                        <Link data-tour="list-new" href="/manage/crew/new" className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            + 새 크루
                        </Link>
                    )}
                </div>
            )}

            {!isTrashView && trashedCount > 0 && (
                <Link data-tour="list-trash" href="/manage/crew?view=trash" className="inline-block mb-4 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4">
                    휴지통 보기 ({trashedCount})
                </Link>
            )}
            {isTrashView && members.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">휴지통이 비어 있어요.</p>}

            {!isTrashView && members.length === 0 && (
                <EmptyState
                    title="아직 등록된 크루가 없어요"
                    body="크루를 추가하면 홈페이지 Crew 페이지에 소개돼요. 사진, 이름, 직책만 있으면 시작할 수 있어요."
                    actionHref={writeReady ? "/manage/crew/new" : undefined}
                    actionLabel={writeReady ? "+ 첫 크루 만들기" : undefined}
                />
            )}

            <ManagedList
                reorder={!isTrashView && writeReady ? reorderCrew : undefined}
                searchPlaceholder="이름·직책으로 찾기"
                statusFilter
                items={members.map((m, index) => {
                    const hidden = m.isActive === false;
                    const thumbnail = manageThumbnail(m.image);
                    return {
                        id: m._id,
                        search: [m.koName, m.name, m.role].filter(Boolean).join(" "),
                            status: hidden ? "hidden" : "public",
                        node: (
                            <div className={`flex items-stretch gap-3 bg-white rounded-2xl border border-neutral-200 hover:border-black hover:shadow-sm transition-all ${hidden ? "opacity-50" : ""}`}>
                                {!isTrashView && writeReady && (
                                    <div className="flex items-center pl-2">
                                        <DragHandle id={m._id} />
                                        <ReorderButtons documentId={m._id} disableUp={index === 0} disableDown={index === members.length - 1} move={moveCrewOrder} />
                                    </div>
                                )}
                                <Link href={`/manage/crew/${encodeURIComponent(m._id)}`} className="flex items-center gap-4 flex-1 min-w-0 p-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                                        {thumbnail && <Image src={thumbnail} alt="" fill sizes="56px" className="object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-base truncate">{m.koName ?? m.name ?? "(이름 없음)"}</p>
                                            {hidden && !isTrashView && <span className="shrink-0 text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">비공개</span>}
                                        </div>
                                        <p className="text-sm text-neutral-500 truncate">{m.role}{formatUpdated(m._updatedAt) && (<> · <time dateTime={m._updatedAt} title={formatAbsolute(m._updatedAt as string)}>{formatUpdated(m._updatedAt)}</time></>)}</p>
                                    </div>
                                    {!isTrashView && <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">›</span>}
                                </Link>
                                {isTrashView && writeReady && (
                                    <div className="flex items-center pr-3">
                                        <RestoreButton documentId={m._id} restore={restoreCrew} />
                                    </div>
                                )}
                            </div>
                        
                        ),
                    };
                })}
            />

            <p className="text-sm text-neutral-500 mt-8 leading-relaxed border-t border-neutral-200 pt-4">
                저장 실수로 내용이 잘못됐다면, 개발자에게 요청해 <code className="bg-neutral-100 text-neutral-700 px-1 rounded">/admin</code>의 문서 이력에서 이전 내용을 확인할 수 있어요.
            </p>
        </main>
    );
}
