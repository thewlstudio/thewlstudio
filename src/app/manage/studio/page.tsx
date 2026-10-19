import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ManageNav from "../ManageNav";
import ReorderButtons from "../_components/ReorderButtons";
import RestoreButton from "../_components/RestoreButton";
import { moveSpaceOrder, restoreSpace } from "./actions";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const metadata = { title: "스튜디오 공간 관리" };
export const dynamic = "force-dynamic";

type Row = { _id: string; kind?: string; name?: string; isActive?: boolean; cover?: SanityImageSource; photoCount?: number };

const fields = `_id, kind, name, isActive, "cover": images[0], "photoCount": count(images)`;
// 공개 화면과 같은 순서: 연습실이 먼저, 로비는 그 뒤
const listQuery = `*[_type == "studioSpace" && !(trashed == true)] | order(select(kind == "lobby" => 1, 0) asc, order asc) { ${fields} }`;
const trashedQuery = `*[_type == "studioSpace" && trashed == true] | order(_updatedAt desc) { ${fields} }`;

export default async function StudioSpacesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const { view } = await searchParams;
    const isTrashView = view === "trash";
    const writeReady = isWriteConfigured();

    const [spaces, trashedCount] = await Promise.all([
        client.fetch<Row[]>(isTrashView ? trashedQuery : listQuery),
        isTrashView ? Promise.resolve(0) : client.fetch<number>(`count(*[_type == "studioSpace" && trashed == true])`),
    ]);

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title={isTrashView ? "스튜디오 공간 휴지통" : "스튜디오 공간 관리"} />

            {!writeReady && (
                <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed">
                    <p className="font-bold mb-1">아직 저장 기능이 켜지지 않았습니다</p>
                    <p className="text-neutral-700">
                        내용을 보는 것은 되지만, 저장하려면 Sanity 쓰기 토큰 설정이 필요합니다. 개발자에게{" "}
                        <code className="bg-white/70 px-1 rounded">SANITY_API_WRITE_TOKEN</code> 설정을 요청해 주세요.
                    </p>
                </div>
            )}

            {isTrashView ? (
                <>
                    <p className="text-sm text-neutral-600 mb-4">삭제된 공간 {spaces.length}개. 복원하면 원래 순서 그대로 다시 나타납니다.</p>
                    <Link href="/manage/studio" className="inline-block mb-4 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4">
                        ← 공간 목록으로
                    </Link>
                </>
            ) : (
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-sm text-neutral-600">수정할 공간을 눌러주세요. 총 {spaces.length}개입니다.</p>
                    {writeReady && (
                        <Link href="/manage/studio/new" className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                            + 새 공간
                        </Link>
                    )}
                </div>
            )}

            {!isTrashView && trashedCount > 0 && (
                <Link href="/manage/studio?view=trash" className="inline-block mb-4 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4">
                    휴지통 보기 ({trashedCount})
                </Link>
            )}
            {isTrashView && spaces.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">휴지통이 비어있습니다.</p>}

            <ul className="space-y-3">
                {spaces.map((sp, index) => {
                    const hidden = sp.isActive === false;
                    const isLobby = sp.kind === "lobby";
                    // 순서 이동은 같은 종류끼리만 — 이웃이 다른 종류면 그쪽으로는 이동할 수 없다
                    const sameKind = (other?: Row) => !!other && (other.kind === "lobby") === isLobby;
                    const prevSame = sameKind(spaces[index - 1]);
                    const nextSame = sameKind(spaces[index + 1]);
                    return (
                        <li key={sp._id}>
                            <div className={`flex items-stretch gap-3 bg-white rounded-2xl border border-neutral-200 hover:border-black hover:shadow-sm transition-all ${hidden ? "opacity-50" : ""}`}>
                                {!isTrashView && writeReady && (
                                    <div className="flex items-center pl-2">
                                        <ReorderButtons documentId={sp._id} disableUp={!prevSame} disableDown={!nextSame} move={moveSpaceOrder} />
                                    </div>
                                )}
                                <Link href={`/manage/studio/${encodeURIComponent(sp._id)}`} className="flex items-center gap-4 flex-1 min-w-0 p-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                                        {sp.cover && <Image src={urlFor(sp.cover).width(112).height(112).fit("crop").url()} alt="" fill sizes="56px" className="object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-base truncate">{sp.name ?? "(이름 없음)"}</p>
                                            {hidden && !isTrashView && <span className="shrink-0 text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">비공개</span>}
                                        </div>
                                        <p className="text-sm text-neutral-500 truncate">
                                            {isLobby ? "로비" : "연습실"} · 사진 {sp.photoCount ?? 0}장
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
                        </li>
                    );
                })}
            </ul>

            <p className="text-sm text-neutral-400 mt-8 leading-relaxed border-t border-neutral-200 pt-4">
                스튜디오 페이지의 서비스 가격·장비·멤버십·이용 안내 문구는 아직 이 화면에서 바꿀 수 없습니다. 연습실·로비 카드만 관리됩니다. 로비는 한 곳만 화면에 나옵니다.
            </p>
        </main>
    );
}
