import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { isAuthenticated, destroySession } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import ReorderButtons from "./ReorderButtons";
import RestoreButton from "./RestoreButton";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const metadata = { title: "강사 관리" };
// 관리 화면은 항상 최신 데이터를 보여야 한다
export const dynamic = "force-dynamic";

type InstructorRow = {
    _id: string;
    instructorName?: string;
    category?: string;
    order?: number;
    image?: SanityImageSource;
    isActive?: boolean;
};

const listQuery = `*[_type == "instructor" && !(trashed == true)] | order(order asc) {
    _id, instructorName, category, order, image, isActive
}`;

const trashedQuery = `*[_type == "instructor" && trashed == true] | order(_updatedAt desc) {
    _id, instructorName, category, image
}`;

async function logout() {
    "use server";
    await destroySession();
    redirect("/manage/login");
}

export default async function InstructorListPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    const { view } = await searchParams;
    const isTrashView = view === "trash";
    const writeReady = isWriteConfigured();

    const [instructors, trashedCount] = await Promise.all([
        client.fetch<InstructorRow[]>(isTrashView ? trashedQuery : listQuery),
        // 일반 목록에서도 "휴지통 (N)" 링크에 개수를 보여주기 위해 항상 조회
        isTrashView ? Promise.resolve(0) : client.fetch<number>(`count(*[_type == "instructor" && trashed == true])`),
    ]);

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <header className="flex items-start justify-between gap-4 mb-8">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                        White Light Studio
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {isTrashView ? "휴지통" : "강사 관리"}
                    </h1>
                </div>
                <form action={logout}>
                    <button
                        type="submit"
                        className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors underline underline-offset-4 py-2"
                    >
                        나가기
                    </button>
                </form>
            </header>

            {!writeReady && (
                <div
                    role="alert"
                    className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed"
                >
                    <p className="font-bold mb-1">아직 저장 기능이 켜지지 않았습니다</p>
                    <p className="text-neutral-700">
                        내용을 보는 것은 되지만, 저장하려면 Sanity 쓰기 토큰 설정이 필요합니다.
                        개발자에게 <code className="bg-white/70 px-1 rounded">SANITY_API_WRITE_TOKEN</code> 설정을 요청해 주세요.
                    </p>
                </div>
            )}

            {isTrashView ? (
                <>
                    <p className="text-sm text-neutral-600 mb-4">
                        삭제된 강사 {instructors.length}명. 복원하면 기존 목록에 원래 순서 그대로 다시 나타납니다.
                    </p>
                    <Link
                        href="/manage/instructors"
                        className="inline-block mb-4 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4"
                    >
                        ← 강사 목록으로
                    </Link>
                </>
            ) : (
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-sm text-neutral-600">
                        수정할 강사를 눌러주세요. 총 {instructors.length}명이 등록되어 있습니다.
                    </p>
                    {writeReady && (
                        <Link
                            href="/manage/instructors/new"
                            className="shrink-0 h-10 px-4 rounded-xl bg-black text-white text-sm font-bold flex items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            + 새 강사
                        </Link>
                    )}
                </div>
            )}

            {!isTrashView && trashedCount > 0 && (
                <Link
                    href="/manage/instructors?view=trash"
                    className="inline-block mb-4 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4"
                >
                    휴지통 보기 ({trashedCount})
                </Link>
            )}

            {isTrashView && instructors.length === 0 && (
                <p className="text-sm text-neutral-500 py-8 text-center">휴지통이 비어있습니다.</p>
            )}

            <ul className="space-y-3">
                {instructors.map((instructor, index) => {
                    const isHidden = instructor.isActive === false;
                    return (
                        <li key={instructor._id}>
                            <div
                                className={`flex items-stretch gap-3 bg-white rounded-2xl border border-neutral-200 hover:border-black hover:shadow-sm transition-all ${isHidden ? "opacity-50" : ""}`}
                            >
                                {!isTrashView && writeReady && (
                                    <div className="flex items-center pl-2">
                                        <ReorderButtons
                                            documentId={instructor._id}
                                            disableUp={index === 0}
                                            disableDown={index === instructors.length - 1}
                                        />
                                    </div>
                                )}
                                <Link
                                    href={`/manage/instructors/${encodeURIComponent(instructor._id)}`}
                                    className="flex items-center gap-4 flex-1 min-w-0 p-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                >
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                                        {instructor.image && (
                                            <Image
                                                src={urlFor(instructor.image).width(112).height(112).fit("crop").url()}
                                                alt=""
                                                fill
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-base truncate">
                                                {instructor.instructorName ?? "(이름 없음)"}
                                            </p>
                                            {isHidden && !isTrashView && (
                                                <span className="shrink-0 text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                                                    비공개
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-500 truncate">{instructor.category}</p>
                                    </div>
                                    {!isTrashView && (
                                        <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">
                                            ›
                                        </span>
                                    )}
                                </Link>
                                {isTrashView && writeReady && (
                                    <div className="flex items-center pr-3">
                                        <RestoreButton documentId={instructor._id} />
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {isTrashView && instructors.length > 0 && (
                <p className="text-sm text-neutral-500 mt-6 leading-relaxed">
                    완전 삭제는 아직 지원하지 않습니다. 꼭 필요하면 개발자에게{" "}
                    <code className="bg-neutral-100 px-1 rounded">/admin</code>에서 직접 삭제해 달라고 요청하세요.
                </p>
            )}

            <p className="text-sm text-neutral-400 mt-8 leading-relaxed border-t border-neutral-200 pt-4">
                저장 실수로 내용이 잘못됐다면, 개발자에게 요청해{" "}
                <code className="bg-neutral-100 px-1 rounded">/admin</code>의 문서 이력에서 이전 내용을
                확인할 수 있습니다.
            </p>
        </main>
    );
}
