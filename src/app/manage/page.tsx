import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "./ManageNav";

// title.template 상속이 이 세그먼트(레이아웃과 같은 위치의 page.tsx)에서는
// 이상하게 루트 레이아웃 쪽 템플릿을 타는 현상이 있어, 최종 문자열을 직접 지정
export const metadata = { title: { absolute: "관리 허브 | 홈페이지 관리" } };

type Section = {
    key: string;
    label: string;
    description: string;
    href: string | null;
};

// href가 null이면 아직 구현되지 않은 영역 — "준비 중"으로 표시하고 이동은 막는다.
const SECTIONS: Section[] = [
    { key: "instructors", label: "강사", description: "레슨 강사 정보 관리", href: "/manage/instructors" },
    { key: "crew", label: "Crew", description: "크루 프로필 관리", href: null },
    { key: "works", label: "Works", description: "작업물 페이지 관리", href: null },
    { key: "studio", label: "Studio", description: "스튜디오 방 정보 관리", href: null },
    { key: "contact", label: "Contact", description: "연락처·지도 정보 관리", href: null },
];

export default async function ManageHubPage() {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title="관리 허브" showHubLink={false} />

            <p className="text-sm text-neutral-600 mb-4">관리할 항목을 선택해 주세요.</p>

            <ul className="space-y-3">
                {SECTIONS.map((section) => (
                    <li key={section.key}>
                        {section.href ? (
                            <Link
                                href={section.href}
                                className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-base truncate">{section.label}</p>
                                    <p className="text-sm text-neutral-500 truncate">{section.description}</p>
                                </div>
                                <span aria-hidden="true" className="text-neutral-400 text-xl shrink-0">
                                    ›
                                </span>
                            </Link>
                        ) : (
                            <div
                                aria-disabled="true"
                                className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-neutral-200 bg-neutral-100"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-base text-neutral-500 truncate">{section.label}</p>
                                    <p className="text-sm text-neutral-400 truncate">{section.description}</p>
                                </div>
                                <span className="shrink-0 text-[10px] font-bold text-neutral-500 bg-neutral-200 px-2 py-1 rounded">
                                    준비 중
                                </span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </main>
    );
}
