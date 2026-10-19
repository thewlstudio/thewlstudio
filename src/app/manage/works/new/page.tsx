import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "../../ManageNav";
import WorkForm, { type WorkFormData } from "../[id]/WorkForm";

export const metadata = { title: "새 작업물 추가" };
export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const empty: WorkFormData = {
        _id: "",
        title: "",
        artist: "",
        slug: "",
        releaseDate: "",
        imageUrl: null,
        youtubeUrl: "",
        instagramId: "",
        instagramUrl: "",
        blocks: [],
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="새 작업물 추가" />
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">작업물 정보를 입력해 주세요</h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">기본 정보를 만든 뒤, 상세 페이지 내용(설명·크레딧 등)은 추가 단계에서 편집할 수 있어요.</p>
            </div>
            <WorkForm data={empty} mode="create" />
        </main>
    );
}
