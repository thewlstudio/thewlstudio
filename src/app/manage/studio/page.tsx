import Link from "../_components/GuardedLink";
import Image from "@/components/CmsImage";
import { redirect } from "next/navigation";
import { STUDIO_CONTENT_ORDER } from "@/lib/content-order";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../ManageNav";
import ReorderButtons from "../_components/ReorderButtons";
import ManagedList, { DragHandle } from "../_components/ManagedList";
import RestoreButton from "../_components/RestoreButton";
import { moveSpaceOrder, restoreSpace, reorderSpaces } from "./actions";
import { listReadIssue } from "@/lib/manage-list-read";
import { manageThumbnail } from "@/lib/manage-thumbnail";
import ListReadFailure from "../_components/ListReadFailure";
import { formatUpdated, formatAbsolute } from "@/lib/format-updated";
import EmptyState from "../_components/EmptyState";

export const metadata = { title: "스튜디오 공간 관리" };
export const dynamic = "force-dynamic";

type Row = { _id: string; _updatedAt?: string; kind?: string; name?: string; isActive?: boolean; cover?: unknown; photoCount?: number };

const fields = `_id, _type, _updatedAt, kind, name, isActive, trashed, order, "cover": images[0], "photoCount": count(images)`;
// 공개 화면과 같은 순서: 연습실이 먼저, 로비는 그 뒤
const listQuery = `*[_type == "studioSpace" && !(trashed == true)] | order(${STUDIO_CONTENT_ORDER}) { ${fields} }`;
const trashedQuery = `*[_type == "studioSpace" && trashed == true] | order(_updatedAt desc) { ${fields} }`;

export default async function StudioSpacesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { view } = await searchParams;
    const isTrashView = view === "trash";
    const writeReady = isWriteConfigured();

    const [result, countResult] = await Promise.all([
        client.fetch<unknown>(isTrashView ? trashedQuery : listQuery),
        isTrashView ? Promise.resolve(0) : client.fetch<unknown>(`count(*[_type == "studioSpace" && trashed == true])`),
    ]);
    const issue = listReadIssue("studioSpace", result, countResult, isTrashView);
    if (issue) return <ListReadFailure title={isTrashView ? "스튜디오 공간 휴지통" : "스튜디오 공간 관리"} fields={issue.fields} />;
    const spaces = result as Row[];
    const trashedCount = countResult as number;

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title={isTrashView ? "스튜디오 공간 휴지통" : "스튜디오 공간 관리"} />

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
                    <p className="text-sm text-neutral-600 mb-4">삭제된 공간 {spaces.length}개. 복원하면 원래 순서 그대로 다시 나타나요.</p>
                    <Link href="/manage/studio" className="inline-block mb-4 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4">
                        ← 공간 목록으로
                    </Link>
                </>
            ) : (
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-sm text-neutral-600">수정할 공간을 눌러 주세요. 총 {spaces.length}개예요.</p>
                    {writeReady && (
                        <Link data-tour="list-new" href="/manage/studio/new" className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            + 새 공간
                        </Link>
                    )}
                </div>
            )}

            {!isTrashView && (
                <Link href="/manage/studio/info" className="flex items-center justify-between gap-4 p-4 mt-3 mb-4 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                    <div className="min-w-0">
                        <p className="font-bold text-base">서비스·장비·멤버십·이용 안내</p>
                        <p className="text-sm text-neutral-500">보컬 레코딩 가격, 장비 목록, 회원권 가격, 주차·이용 수칙</p>
                    </div>
                    <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">›</span>
                </Link>
            )}

            {!isTrashView && trashedCount > 0 && (
                <Link data-tour="list-trash" href="/manage/studio?view=trash" className="inline-block mb-4 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4">
                    휴지통 보기 ({trashedCount})
                </Link>
            )}
            {isTrashView && spaces.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">휴지통이 비어 있어요.</p>}

            {!isTrashView && spaces.length === 0 && (
                <EmptyState
                    title="아직 등록된 공간이 없어요"
                    body="연습실이나 로비를 추가하면 Studio 페이지에 카드로 나와요."
                    actionHref={writeReady ? "/manage/studio/new" : undefined}
                    actionLabel={writeReady ? "+ 첫 공간 만들기" : undefined}
                />
            )}

            <ManagedList
                reorder={!isTrashView && writeReady ? reorderSpaces : undefined}
                searchPlaceholder="이름으로 찾기"
                statusFilter
                items={spaces.map((sp, index) => {
                    const hidden = sp.isActive === false;
                    const thumbnail = manageThumbnail(sp.cover);
                    const isLobby = sp.kind === "lobby";
                    // 순서 이동은 같은 종류끼리만 — 이웃이 다른 종류면 그쪽으로는 이동할 수 없다
                    const sameKind = (other?: Row) => !!other && (other.kind === "lobby") === isLobby;
                    const prevSame = sameKind(spaces[index - 1]);
                    const nextSame = sameKind(spaces[index + 1]);
                    return {
                        id: sp._id,
                        search: [sp.name, isLobby ? "로비" : "연습실"].filter(Boolean).join(" "),
                            status: hidden ? "hidden" : "public",
                            group: isLobby ? "lobby" : "room",
                        node: (
                            <div className={`flex items-stretch gap-3 bg-white rounded-2xl border border-neutral-200 hover:border-black hover:shadow-sm transition-all ${hidden ? "opacity-50" : ""}`}>
                                {!isTrashView && writeReady && (
                                    <div className="flex items-center pl-2">
                                        <DragHandle id={sp._id} />
                                        <ReorderButtons documentId={sp._id} label={sp.name} disableUp={!prevSame} disableDown={!nextSame} move={moveSpaceOrder} />
                                    </div>
                                )}
                                <Link href={`/manage/studio/${encodeURIComponent(sp._id)}`} className="flex items-center gap-4 flex-1 min-w-0 p-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                                        {thumbnail && <Image src={thumbnail} alt="" fill sizes="56px" className="object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-base truncate">{sp.name ?? "(이름 없음)"}</p>
                                            {hidden && !isTrashView && <span className="shrink-0 text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">비공개</span>}
                                        </div>
                                        <p className="text-sm text-neutral-500 truncate">
                                            {isLobby ? "로비" : "연습실"} · 사진 {sp.photoCount ?? 0}장{formatUpdated(sp._updatedAt) && (<> · <time dateTime={sp._updatedAt} title={formatAbsolute(sp._updatedAt as string)}>{formatUpdated(sp._updatedAt)}</time></>)}
                                        </p>
                                    </div>
                                    {!isTrashView && <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">›</span>}
                                </Link>
                                {isTrashView && writeReady && (
                                    <div className="flex items-center pr-3">
                                        <RestoreButton documentId={sp._id} restore={restoreSpace} />
                                    </div>
                                )}
                            </div>
                        
                        ),
                    };
                })}
            />

            <p className="text-sm text-neutral-500 mt-8 leading-relaxed border-t border-neutral-200 pt-4">
                위 목록은 연습실·로비 카드예요. 서비스 가격·장비·멤버십·이용 안내는 위의 &quot;서비스·장비·멤버십·이용 안내&quot;에서 고쳐요. 로비는 한 곳만 화면에 나와요.
            </p>
        </main>
    );
}
