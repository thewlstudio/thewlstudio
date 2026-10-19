import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "../../ManageNav";
import CrewForm, { type CrewFormData } from "../[id]/CrewForm";

export const metadata = { title: "새 크루 추가" };
export const dynamic = "force-dynamic";

export default async function NewCrewPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const empty: CrewFormData = {
        _id: "",
        isActive: true,
        name: "",
        koName: "",
        role: "",
        slug: "",
        imageUrl: null,
        links: [],
        sections: [],
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="새 크루 추가" />
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">크루 정보를 입력해 주세요</h2>
            </div>
            <CrewForm data={empty} mode="create" />
        </main>
    );
}
