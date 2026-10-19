import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "../../ManageNav";
import SpaceForm, { type SpaceFormData } from "../[id]/SpaceForm";

export const metadata = { title: "새 공간 추가" };
export const dynamic = "force-dynamic";

export default async function NewSpacePage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const empty: SpaceFormData = {
        _id: "",
        kind: "room",
        isActive: true,
        name: "",
        subtitle: "",
        description: "",
        prices: [{ key: "new-p0", label: "기본", value: "", unit: "원 / 1H" }],
        features: [],
        notes: [],
        images: [],
    };

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="새 공간 추가" />
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">공간 정보를 입력해 주세요</h2>
            </div>
            <SpaceForm data={empty} mode="create" />
        </main>
    );
}
