import Link from "../_components/GuardedLink";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "../ManageNav";

export const metadata = { title: "홈페이지 지도" };

type Pin = { n: number; what: string; where: string; href: string };
type Block = { label: string; pin?: number; h: "s" | "m" | "l"; dark?: boolean };
type PageDef = { id: string; title: string; path: string; note?: string; blocks: Block[]; pins: Pin[] };

const CONTACT = "/manage/contact";

/**
 * 홈페이지 화면 구성을 단순한 그림으로 보여 주고, 각 부분을 어디서 고치는지 번호로 연결한다.
 * 핀이 없는 칸은 코드에서 관리하는 고정 영역이다. (설계: docs/ONBOARDING_DESIGN.md)
 */
const PAGES: PageDef[] = [
    {
        id: "home",
        title: "홈 (첫 화면)",
        path: "/",
        blocks: [
            { label: "머리말 (로고 · 메뉴 · 인스타그램 아이콘)", pin: 1, h: "s", dark: true },
            { label: "첫 화면 대형 이미지·제목", h: "l", dark: true },
            { label: "소개 영역: 큰 제목 + 설명 문단", pin: 2, h: "m", dark: true },
            { label: "꼬리말", h: "s", dark: true },
        ],
        pins: [
            { n: 1, what: "머리말의 인스타그램 아이콘 주소", where: "Contact › 링크", href: CONTACT },
            { n: 2, what: "소개 영역의 큰 제목과 설명", where: "Contact › 홈페이지 소개 문구", href: CONTACT },
        ],
    },
    {
        id: "class",
        title: "Class (레슨)",
        path: "/class",
        blocks: [
            { label: "머리말", h: "s", dark: true },
            { label: "강사 카드 목록 (사진 · 이름 · 분야)", pin: 1, h: "l" },
            { label: "강사를 누르면 열리는 상세 창 (소개 · 커리큘럼)", pin: 1, h: "m" },
            { label: "예약하기 버튼", pin: 2, h: "s" },
        ],
        pins: [
            { n: 1, what: "강사 카드와 상세 창의 모든 내용, 순서", where: "강사", href: "/manage/instructors" },
            { n: 2, what: "예약하기 버튼이 열리는 주소", where: "Contact › 링크 › 네이버 예약 주소", href: CONTACT },
        ],
    },
    {
        id: "works",
        title: "Works (작업물)",
        path: "/works",
        blocks: [
            { label: "머리말", h: "s", dark: true },
            { label: "작업물 카드 목록 (커버 · 제목 · 아티스트 · 발매일)", pin: 1, h: "l" },
            { label: "[상세] 커버 · 제목 · 아티스트 · 발매일", pin: 1, h: "m" },
            { label: "[상세] 유튜브·인스타그램 링크 버튼", pin: 2, h: "s" },
            { label: "[상세] 설명 · 크레딧 · 트랙리스트 · 인사말 · 이미지 · 영상", pin: 3, h: "l" },
        ],
        pins: [
            { n: 1, what: "목록 카드와 상세 맨 위의 제목·아티스트·발매일·커버", where: "Works › 기본 정보 · 커버 이미지", href: "/manage/works" },
            { n: 2, what: "유튜브·인스타그램 링크", where: "Works › 링크", href: "/manage/works" },
            { n: 3, what: "상세 페이지 본문(블록)", where: "Works › 상세 페이지 내용", href: "/manage/works" },
        ],
    },
    {
        id: "crew",
        title: "Crew (크루)",
        path: "/crew",
        blocks: [
            { label: "머리말", h: "s", dark: true },
            { label: "크루 카드 목록 (사진 · 이름 · 직책)", pin: 1, h: "l" },
            { label: "[상세] 사진 · 이름 · 소셜 아이콘", pin: 2, h: "m" },
            { label: "[상세] 소개 · 경력 · 수상 · 학력", pin: 3, h: "l" },
        ],
        pins: [
            { n: 1, what: "목록 카드의 사진·이름·직책, 카드 순서", where: "Crew › 기본 정보 · 프로필 사진", href: "/manage/crew" },
            { n: 2, what: "소셜 아이콘과 링크", where: "Crew › 소셜 링크", href: "/manage/crew" },
            { n: 3, what: "이력 블록(소개·음반 경력·경력·수상·학력)", where: "Crew › 프로필 섹션", href: "/manage/crew" },
        ],
    },
    {
        id: "studio",
        title: "Studio (스튜디오)",
        path: "/studio",
        blocks: [
            { label: "머리말 · 대형 이미지", h: "m", dark: true },
            { label: "서비스 카드 (보컬 레코딩 · 오디오 외주)", pin: 1, h: "m", dark: true },
            { label: "장비 목록", pin: 2, h: "m" },
            { label: "멤버십 카드 + 안내 문구 + 가입 버튼", pin: 3, h: "m", dark: true },
            { label: "공간 카드 (연습실 A~D · 로비: 사진 · 가격 · 특징)", pin: 4, h: "l" },
            { label: "이용 안내 (주차 · 편의시설 · CCTV · 수칙)", pin: 5, h: "m" },
            { label: "문의 버튼 · 블로그 링크", pin: 6, h: "s", dark: true },
        ],
        pins: [
            { n: 1, what: "서비스 제목·가격·설명", where: "Studio › 서비스·장비·멤버십·이용 안내 › 서비스", href: "/manage/studio/info" },
            { n: 2, what: "장비 묶음과 장비 이름", where: "Studio › 서비스·장비·멤버십·이용 안내 › 장비", href: "/manage/studio/info" },
            { n: 3, what: "회원권 이름·금액, 안내 문구 (가입 버튼 주소는 Contact)", where: "Studio › … › 멤버십", href: "/manage/studio/info" },
            { n: 4, what: "연습실·로비 카드의 사진·가격·특징·안내, 순서", where: "Studio › 공간 목록", href: "/manage/studio" },
            { n: 5, what: "주차·편의시설·CCTV·이용 수칙", where: "Studio › … › 이용 안내", href: "/manage/studio/info" },
            { n: 6, what: "블로그 링크 주소", where: "Contact › 링크 › 블로그 주소", href: CONTACT },
        ],
    },
    {
        id: "contact",
        title: "Contact (오시는 길)",
        path: "/contact",
        blocks: [
            { label: "머리말", h: "s", dark: true },
            { label: "주소 (한글 · 영문) · 전화번호", pin: 1, h: "m" },
            { label: "지도 + ‘Open in Naver Map’ 버튼", pin: 2, h: "l" },
        ],
        pins: [
            { n: 1, what: "주소와 전화번호", where: "Contact › 위치·연락처", href: CONTACT },
            { n: 2, what: "지도 위치와 네이버 지도 버튼 주소", where: "Contact › 지도 · 링크", href: CONTACT },
        ],
    },
];

const H = { s: "h-10", m: "h-16", l: "h-24" } as const;

export default async function MapPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    return (
        <main id="main-content" className="max-w-3xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="홈페이지 지도" />
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                홈페이지의 <strong>어느 부분을 어디서 고치는지</strong> 한눈에 보여 드려요. <strong>번호가 붙은 칸</strong>을 누르면 해당 수정 화면으로 이동해요. 번호가 없는 회색·검정 칸은 코드에서 관리하는 고정 영역이라, 바꾸려면 개발자에게 요청해 주세요.
            </p>

            <nav aria-label="페이지 바로가기" className="flex flex-wrap gap-2 mb-8">
                {PAGES.map((p) => (
                    <a
                        key={p.id}
                        href={`#map-${p.id}`}
                        className="h-9 px-3 rounded-lg border border-neutral-300 bg-white text-sm font-bold flex items-center hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        {p.title.split(" ")[0]}
                    </a>
                ))}
            </nav>

            <div className="space-y-8">
                {PAGES.map((p) => (
                    <section key={p.id} id={`map-${p.id}`} aria-labelledby={`t-${p.id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 scroll-mt-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 id={`t-${p.id}`} className="text-lg font-black">{p.title}</h2>
                            <a href={p.path} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                                실제 화면 보기 ↗
                            </a>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,15rem)_1fr] gap-5">
                            {/* 화면 구성 그림 */}
                            <div role="img" aria-label={`${p.title} 화면 구성 그림. 오른쪽(아래) 표에서 번호별 수정 위치를 확인하세요.`} className="rounded-xl border border-neutral-300 bg-neutral-100 p-2 space-y-1.5">
                                {p.blocks.map((b, i) => {
                                    const pin = b.pin ? p.pins.find((x) => x.n === b.pin) : undefined;
                                    const cls = `relative ${H[b.h]} rounded-md px-2 py-1 text-[11px] leading-tight flex items-center ${b.dark ? "bg-neutral-800 text-neutral-200" : "bg-white text-neutral-700 border border-neutral-300"}`;
                                    const inner = (
                                        <>
                                            {b.pin && <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center shadow">{b.pin}</span>}
                                            <span className="pl-3 break-keep">{b.label}</span>
                                        </>
                                    );
                                    return pin ? (
                                        <Link key={i} href={pin.href} aria-hidden="true" tabIndex={-1} className={`${cls} hover:ring-2 hover:ring-red-600 transition-shadow`}>
                                            {inner}
                                        </Link>
                                    ) : (
                                        <div key={i} aria-hidden="true" className={cls}>{inner}</div>
                                    );
                                })}
                            </div>

                            {/* 번호별 수정 위치 (키보드·스크린 리더용 실제 링크) */}
                            <ol className="space-y-3">
                                {p.pins.map((pin) => (
                                    <li key={pin.n} className="flex items-start gap-3">
                                        <span aria-hidden="true" className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">{pin.n}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold">{pin.what}</p>
                                            <Link href={pin.href} className="text-sm text-neutral-600 hover:text-black underline underline-offset-4 inline-block py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                                                {pin.where} 수정하러 가기 →
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>
                ))}
            </div>

            <p className="text-sm text-neutral-500 mt-8 leading-relaxed">
                그림은 구성을 단순하게 나타낸 것이라 실제 모양·크기와 달라요. 홈페이지가 바뀌면 이 그림도 함께 고쳐야 해서, 맞지 않는 곳을 발견하면 개발자에게 알려 주세요.
            </p>
        </main>
    );
}
