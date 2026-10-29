import Link from "./_components/GuardedLink";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "./ManageNav";
import FirstTimeGuide from "./FirstTimeGuide";
import SetupChecklist from "./_components/checklist/SetupChecklist";
import { client } from "@/sanity/lib/client";
import { formatAbsolute, formatUpdated } from "@/lib/format-updated";
import { HUB_RECENT_META, readHubCounts, readHubRecent, type HubCounts } from "@/lib/manage-hub-read";

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

const COUNT_QUERY = `{
    "instructors": count(*[_type == "instructor" && !(trashed == true)]),
    "instructorsHidden": count(*[_type == "instructor" && !(trashed == true) && isActive == false]),
    "crew": count(*[_type == "crew" && !(trashed == true)]),
    "crewHidden": count(*[_type == "crew" && !(trashed == true) && isActive == false]),
    "works": count(*[_type == "work" && !(trashed == true)]),
    "rooms": count(*[_type == "studioSpace" && !(trashed == true) && kind != "lobby"]),
    "lobbies": count(*[_type == "studioSpace" && !(trashed == true) && kind == "lobby"])
}`;

/** 허브 카드에 붙는 현황 문구 (게임의 "보유 1/30"처럼 지금 상태를 한눈에) */
function statusText(key: string, c: HubCounts | null): string | null {
    if (!c) return null;
    const hid = (n: number) => (n > 0 ? ` · 비공개 ${n}` : "");
    switch (key) {
        case "instructors": return `${c.instructors}명${hid(c.instructorsHidden)}`;
        case "crew": return `${c.crew}명${hid(c.crewHidden)}`;
        case "works": return `${c.works}개`;
        case "studio": return `연습실 ${c.rooms} · 로비 ${c.lobbies}`;
        default: return null;
    }
}

const RECENT_QUERY = `*[_type in ["instructor","crew","work","studioSpace","studioInfo","siteSettings"]] | order(_updatedAt desc)[0...6]{
    _id, _type, _updatedAt,
    "title": coalesce(instructorName, koName, title, name)
}`;

export default async function ManageHubPage() {
    if (!(await isAuthenticated())) {
        redirect("/manage/login");
    }

    // 최근 수정은 보조 정보라, 읽기에 실패해도 허브 자체는 그대로 보여 준다
    const [recentRaw, countsRaw] = await Promise.all([
        client.fetch<unknown>(RECENT_QUERY).catch(() => undefined),
        client.fetch<unknown>(COUNT_QUERY).catch(() => undefined),
    ]);
    const recent = readHubRecent(recentRaw);
    const counts = readHubCounts(countsRaw);

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title="관리 허브" showHubLink={false} />

            <FirstTimeGuide />
            <SetupChecklist />

            <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-sm text-neutral-600">관리할 항목을 선택해 주세요.</p>
                <div className="flex items-center gap-4 shrink-0">
                <Link
                        data-tour="hub-map"
                        href="/manage/map"
                        className="shrink-0 py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                    >
                        홈페이지 지도
                    </Link>
                    <a
                        data-tour="hub-view-site"
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 py-2 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                    >
                        홈페이지 보기 ↗
                    </a>
                </div>
            </div>

            {!counts && <p role="status" className="mb-4 text-sm text-amber-800">등록 현황을 불러오지 못했어요. 각 관리 목록에서 최신 내용을 확인해 주세요.</p>}
            <ul data-tour="hub-cards" className="space-y-3">
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
                                <span className="flex items-center gap-3 shrink-0">
                                    {statusText(section.key, counts) && (
                                        <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-md">{statusText(section.key, counts)}</span>
                                    )}
                                    <span aria-hidden="true" className="text-neutral-400 text-xl">
                                        ›
                                    </span>
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

            {recent === null && <p role="status" className="mt-6 text-sm text-amber-800">최근 수정 목록을 불러오지 못했어요. 위에서 관리할 항목을 선택할 수 있어요.</p>}
            {recent && recent.length > 0 && (
                <section data-tour="hub-recent" aria-labelledby="recent" className="mt-10">
                    <h2 id="recent" className="text-sm font-black tracking-tight mb-3">최근 수정</h2>
                    <ul className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
                        {recent.map((r) => {
                            const meta = HUB_RECENT_META[r._type];
                            return (
                                <li key={r._id}>
                                    <Link
                                        href={meta.href(r._id)}
                                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black first:rounded-t-2xl last:rounded-b-2xl"
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold truncate">{r.title || meta.fallback}</span>
                                            <span className="block text-xs text-neutral-500">{meta.area}</span>
                                        </span>
                                        <time dateTime={r._updatedAt} title={formatAbsolute(r._updatedAt)} className="shrink-0 text-xs text-neutral-500">
                                            {formatUpdated(r._updatedAt)}
                                        </time>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </main>
    );
}
