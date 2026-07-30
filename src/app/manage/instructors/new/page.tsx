import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import InstructorForm, { type InstructorFormData } from "../[id]/InstructorForm";

export const metadata = { title: "새 강사 추가" };
export const dynamic = "force-dynamic";

async function getNextOrder(): Promise<number> {
    const orders = await client.fetch<number[]>(
        `*[_type == "instructor" && defined(order)].order`,
    );
    if (orders.length === 0) return 0;
    return Math.max(...orders) + 1;
}

export default async function NewInstructorPage() {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    const nextOrder = await getNextOrder();

    const emptyData: InstructorFormData = {
        _id: "",
        instructorName: "",
        category: "",
        subtitle: "",
        lessonInfo: "",
        about: [],
        process: [],
        order: nextOrder,
        imagePosition: "object-top",
        portfolioUrl: "",
        portfolioText: "",
        portfolioBtn: "작업물 보기",
        imageUrl: null,
        modalImageUrl: null,
        bgImageUrl: null,
    };

    return (
        <main className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <header className="mb-6">
                <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                    새 강사 추가
                </p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                    강사 정보를 입력해 주세요
                </h1>
            </header>

            <InstructorForm data={emptyData} mode="create" />
        </main>
    );
}
