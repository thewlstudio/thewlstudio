import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "./ManageNav";
import FirstTimeGuide from "./FirstTimeGuide";

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
    { key: "instructors", label: "강사", description: "레슨 강사 소개·사진·수업 정보", href: "/manage/instructors" },
    { key: "crew", label: "Crew", description: "크루 프로필·경력·소셜 링크", href: "/manage/crew" },
    { key: "works", label: "Works", description: "작업물 목록과 상세 페이지 내용", href: "/manage/works" },
    { key: "studio", label: "Studio", description: "연습실·로비, 서비스·장비·멤버십·이용 안내", href: "/manage/studio" },
    { key: "contact", label: "Contact", description: "전화·주소·지도, 예약·SNS 링크, 홈페이지 소개 문구", href: "/manage/contact" },
];

export default async function ManageHubPage() {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title="관리 허브" showHubLink={false} />

            <FirstTimeGuide />

            <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-sm text-neutral-600">관리할 항목을 선택해 주세요.</p>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                >
                    홈페이지 보기 ↗
                </a>
            </div>

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
                                    <p className="text-sm text-neutral-500 break-keep">{section.description}</p>
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
                                    <p className="text-sm text-neutral-500 break-keep">{section.description}</p>
                                </div>
                                <span className="shrink-0 text-[10px] font-bold text-neutral-600 bg-neutral-200 px-2 py-1 rounded">
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
