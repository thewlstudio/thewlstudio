import { notFound, redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import InstructorForm, { type InstructorFormData } from "./InstructorForm";
import DeleteInstructorButton from "./DeleteInstructorButton";
import DuplicateInstructorButton from "./DuplicateInstructorButton";

export const metadata = { title: "강사 수정" };
export const dynamic = "force-dynamic";

const detailQuery = `*[_type == "instructor" && _id == $id][0]{
    _id,
    isActive,
    instructorName,
    category,
    subtitle,
    lessonInfo,
    about,
    process,
    imagePosition,
    portfolioUrl,
    portfolioText,
    portfolioBtn,
    "imageUrl": image.asset->url,
    "modalImageUrl": modalImage.asset->url,
    "bgImageUrl": bgImage.asset->url
}`;

type RawInstructor = Partial<InstructorFormData> & { _id?: string };

export default async function EditInstructorPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    const { id } = await params;
    const raw = await client.fetch<RawInstructor | null>(detailQuery, {
        id: decodeURIComponent(id),
    });

    if (!raw?._id) notFound();

    const writeReady = isWriteConfigured();

    // 예전 방식(코드에 직접 쓰던 시절)의 흔적으로, 줄바꿈이 실제 개행 대신
    // 문자 그대로의 "\n" 두 글자로 저장된 경우가 있다. 편집 화면에서 보기 좋게
    // 진짜 줄바꿈으로 바꿔서 보여준다. (다시 저장하면 이 흔적은 사라진다)
    const fixLegacyNewlines = (s: string) => s.replace(/\\n/g, "\n");

    // 폼은 undefined를 다루지 않도록 여기서 기본값을 채운다
    const data: InstructorFormData = {
        _id: raw._id,
        // 기존 데이터에는 이 필드가 아예 없을 수 있다 — 그 경우 "공개"로 취급한다
        isActive: raw.isActive ?? true,
        instructorName: raw.instructorName ?? "",
        category: raw.category ?? "",
        subtitle: raw.subtitle ?? "",
        lessonInfo: raw.lessonInfo ?? "",
        about: raw.about ?? [],
        process: raw.process ?? [],
        imagePosition: raw.imagePosition ?? "object-top",
        portfolioUrl: raw.portfolioUrl ?? "",
        portfolioText: fixLegacyNewlines(raw.portfolioText ?? ""),
        portfolioBtn: raw.portfolioBtn ?? "작업물 보기",
        imageUrl: raw.imageUrl ?? null,
        modalImageUrl: raw.modalImageUrl ?? null,
        bgImageUrl: raw.bgImageUrl ?? null,
    };

    return (
        <main className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <header className="mb-6 space-y-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                        강사 수정
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {data.instructorName || "이름 없음"}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {writeReady && <DuplicateInstructorButton documentId={data._id} />}
                    <DeleteInstructorButton documentId={data._id} instructorName={data.instructorName} />
                </div>
            </header>

            <InstructorForm data={data} mode="edit" />
        </main>
    );
}
