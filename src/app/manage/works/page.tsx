import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../ManageNav";
import RestoreButton from "../_components/RestoreButton";
import ManagedList from "../_components/ManagedList";
import { restoreWork } from "./actions";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { formatUpdated, formatAbsolute } from "@/lib/format-updated";
import EmptyState from "../_components/EmptyState";

export const metadata = { title: "작업물 관리" };
export const dynamic = "force-dynamic";

type Row = { _id: string; _updatedAt?: string; title?: string; artist?: string; releaseDate?: string; coverImage?: SanityImageSource };

// 공개 목록(worksQuery)과 같은 정렬 — 발매일 최신순
const listQuery = `*[_type == "work" && !(trashed == true)] | order(releaseDate desc) { _id, _updatedAt, title, artist, releaseDate, coverImage }`;
const trashedQuery = `*[_type == "work" && trashed == true] | order(_updatedAt desc) { _id, _updatedAt, title, artist, releaseDate, coverImage }`;

export default async function WorksListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { view } = await searchParams;
    const isTrashView = view === "trash";
    const writeReady = isWriteConfigured();

    const [works, trashedCount] = await Promise.all([
        client.fetch<Row[]>(isTrashView ? trashedQuery : listQuery),
        isTrashView ? Promise.resolve(0) : client.fetch<number>(`count(*[_type == "work" && trashed == true])`),
    ]);

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title={isTrashView ? "작업물 휴지통" : "작업물 관리"} />

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
                    <p className="text-sm text-neutral-600 mb-4">삭제된 작업물 {works.length}개. 복원하면 발매일 순서에 맞춰 목록에 다시 나타나요.</p>
                    <Link href="/manage/works" className="inline-block mb-4 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4">
                        ← 작업물 목록으로
                    </Link>
                </>
            ) : (
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-sm text-neutral-600">수정할 작업물을 눌러 주세요. 발매일 최신순이며, 총 {works.length}개예요.</p>
                    {writeReady && (
                        <Link data-tour="list-new" href="/manage/works/new" className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            + 새 작업물
                        </Link>
                    )}
                </div>
            )}

            {!isTrashView && trashedCount > 0 && (
                <Link data-tour="list-trash" href="/manage/works?view=trash" className="inline-block mb-4 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4">
                    휴지통 보기 ({trashedCount})
                </Link>
            )}
            {isTrashView && works.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">휴지통이 비어 있어요.</p>}

            {!isTrashView && works.length === 0 && (
                <EmptyState
                    title="아직 등록된 작업물이 없어요"
                    body="작업물을 추가하면 홈페이지 Works 목록에 나와요. 제목, 아티스트, 발매일, 커버 이미지로 시작해요."
                    actionHref={writeReady ? "/manage/works/new" : undefined}
                    actionLabel={writeReady ? "+ 첫 작업물 만들기" : undefined}
                />
            )}

            <ManagedList
                searchPlaceholder="제목·아티스트로 찾기"
                items={works.map((w) => {

                    return {
                        id: w._id,
                        search: [w.title, w.artist, w.releaseDate].filter(Boolean).join(" "),
                        node: (
                        <div className="flex items-stretch gap-3 bg-white rounded-2xl border border-neutral-200 hover:border-black hover:shadow-sm transition-all">
                            <Link href={`/manage/works/${encodeURIComponent(w._id)}`} className="flex items-center gap-4 flex-1 min-w-0 p-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                                    {w.coverImage && <Image src={urlFor(w.coverImage).width(112).height(112).fit("crop").url()} alt="" fill sizes="56px" className="object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-base truncate">{w.title ?? "(제목 없음)"}</p>
                                    <p className="text-sm text-neutral-500 truncate">
                                        {w.artist}
                                        {w.releaseDate ? ` · ${w.releaseDate}` : ""}
                                        {formatUpdated(w._updatedAt) && (<> · <time dateTime={w._updatedAt} title={formatAbsolute(w._updatedAt as string)}>{formatUpdated(w._updatedAt)}</time></>)}
                                    </p>
                                </div>
                                {!isTrashView && <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">›</span>}
                            </Link>
                            {isTrashView && writeReady && (
                                <div className="flex items-center pr-3">
                                    <RestoreButton documentId={w._id} restore={restoreWork} />
                                </div>
                            )}
                        </div>
                    
                        ),
                    };
                })}
            />

            <p className="text-sm text-neutral-500 mt-8 leading-relaxed border-t border-neutral-200 pt-4">
                저장 실수로 내용이 잘못됐다면, 개발자에게 요청해 <code className="bg-neutral-100 px-1 rounded">/admin</code>의 문서 이력에서 이전 내용을 확인할 수 있어요.
            </p>
        </main>
    );
}
