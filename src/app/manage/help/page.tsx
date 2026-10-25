import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";
import ManageNav from "../ManageNav";
import OnboardingReset from "./OnboardingReset";

export const metadata = { title: "사용 안내" };

type Item = { q: string; a: React.ReactNode };
type Group = { title: string; items: Item[] };

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="font-semibold underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
        {children}
    </Link>
);

const GROUPS: Group[] = [
    {
        title: "처음 시작할 때",
        items: [
            {
                q: "어디서 무엇을 고칠 수 있나요?",
                a: (
                    <ul className="list-disc pl-5 space-y-1">
                        <li><L href="/manage/instructors">강사</L> — 수업 강사의 소개, 사진, 수업 정보</li>
                        <li><L href="/manage/crew">Crew</L> — 크루 프로필, 경력, 소셜 링크</li>
                        <li><L href="/manage/works">Works</L> — 작업물 목록과 상세 페이지 내용</li>
                        <li><L href="/manage/studio">Studio</L> — 연습실·로비 카드, 서비스·장비·멤버십·이용 안내</li>
                        <li><L href="/manage/contact">Contact</L> — 전화·주소·지도, 예약·SNS 링크, 홈페이지 소개 문구</li>
                    </ul>
                ),
            },
            {
                q: "고치면 홈페이지에 언제 반영되나요?",
                a: "&lsquo;저장하기&rsquo;를 누르면 바로 반영돼요. 저장하기 전에는 홈페이지가 바뀌지 않아요. 저장한 뒤에는 각 화면의 &lsquo;진짜 화면 보기&rsquo;나 허브의 &lsquo;홈페이지 보기&rsquo;로 확인해 보세요.",
            },
            {
                q: "저장하지 않고 나가면 어떻게 되나요?",
                a: "고친 내용이 있으면 &ldquo;저장하지 않은 변경사항이 있어요&rdquo;가 보이고, 다른 곳으로 이동하려 하면 한 번 더 물어봐요. 처음 상태로 돌리고 싶으면 &lsquo;변경 버리기&rsquo;를 누르세요. Ctrl+S (맥은 ⌘+S)를 눌러도 저장돼요.",
            },
        ],
    },
    {
        title: "자주 하는 작업",
        items: [
            {
                q: "사진을 바꾸고 싶어요",
                a: "수정 화면의 사진 칸에서 &lsquo;사진 고르기&rsquo;를 누르세요. 파일을 고르면 미리보기가 바로 바뀌고, &lsquo;저장하기&rsquo;를 눌러야 홈페이지에 반영돼요. 사진이 크면 알아서 줄여서 올려요. (3MB를 넘는 사진은 줄여서 다시 골라 주세요.)",
            },
            {
                q: "새 항목(강사·크루·작업물·공간)을 추가하려면요?",
                a: "각 목록 화면 오른쪽 위의 &lsquo;+ 새 …&rsquo; 버튼을 누르세요. 빨간 별(*)이 붙은 칸은 꼭 채워야 해요. 홈페이지 주소(영문)는 만든 뒤에 바꿀 수 없으니 신중하게 정해 주세요.",
            },
            {
                q: "순서를 바꾸고 싶어요",
                a: "목록 화면에서는 줄 왼쪽의 ▲▼ 버튼으로, 작업물 상세 블록·크루 섹션·사진 목록에서는 ▲▼ 버튼이나 끌어서 바꿀 수 있어요. 작업물 목록은 발매일 최신순으로 자동 정렬돼서 순서를 바꾸는 대신 발매일을 고치면 돼요.",
            },
            {
                q: "잠깐만 숨기고 싶을 때와 삭제의 차이는요?",
                a: "&lsquo;비공개&rsquo;는 홈페이지에서만 숨기고 내용은 그대로 남아요. 언제든 &lsquo;공개&rsquo;로 되돌릴 수 있어요. &lsquo;삭제&rsquo;는 휴지통으로 옮겨서 목록과 홈페이지에서 사라지게 해요. 둘 다 나중에 되돌릴 수 있어요.",
            },
            {
                q: "삭제했는데 되돌릴 수 있나요?",
                a: "삭제 직후에 화면 아래에 뜨는 &lsquo;되돌리기&rsquo; 버튼을 누르면 바로 복원돼요. 시간이 지났다면 목록 위의 &lsquo;휴지통 보기&rsquo;에서 &lsquo;복원&rsquo;을 누르세요. 휴지통에 있는 동안은 홈페이지에 나오지 않아요.",
            },
            {
                q: "가격이나 안내 문구를 바꾸고 싶어요",
                a: (
                    <>
                        <L href="/manage/studio/info">Studio → 서비스·장비·멤버십·이용 안내</L>에서 가격과 문구를, 연습실별 가격은 해당 연습실 수정 화면에서 바꿔요. 전화번호·주소·링크는 <L href="/manage/contact">Contact</L>에서 바꿔요.
                    </>
                ),
            },
            {
                q: "링크(인스타그램, 유튜브 등)는 어떻게 넣나요?",
                a: "해당 사이트에서 주소창의 주소를 통째로 복사해서 붙여넣으면 돼요. 지도는 주소만 적으면 홈페이지가 알아서 만들어요. 주소가 올바르지 않으면 저장할 때 알려 줘요.",
            },
            {
                q: "작업물의 상세 내용(설명·크레딧 등)은 어떻게 꾸미나요?",
                a: "작업물 수정 화면 아래쪽 &lsquo;상세 페이지 내용&rsquo;에서 블록을 추가하고 채워요. 블록은 접었다 펼 수 있고, 위아래로 순서를 바꿀 수 있어요. 오디오 파일을 새로 올리는 일은 /admin에서만 할 수 있어요.",
            },
        ],
    },
    {
        title: "막혔을 때",
        items: [
            {
                q: "&lsquo;저장 기능이 켜지지 않았어요&rsquo;라고 나와요",
                a: "개발자가 설정을 해야 하는 상태예요. 내용을 보는 것은 되지만 저장은 안 돼요. 개발자에게 &ldquo;SANITY_API_WRITE_TOKEN 설정을 요청해 주세요&rdquo;라고 알려 주세요.",
            },
            {
                q: "&lsquo;로그인이 만료됐어요&rsquo;라고 나와요",
                a: "로그인은 12시간 동안 유지돼요. 작성하던 내용은 화면에 그대로 있으니, 새 탭에서 다시 로그인한 뒤 원래 화면으로 돌아와 &lsquo;저장하기&rsquo;를 누르세요. 화면을 새로고침하면 작성한 내용이 사라질 수 있으니 새로고침하지 마세요.",
            },
            {
                q: "빨간 안내가 나오면서 저장이 안 돼요",
                a: "화면 위쪽에 확인할 항목이 나열되고, 누르면 그 칸으로 이동해요. 빨간 안내대로 고치고 다시 저장하세요. 같은 메시지가 계속 나오면 개발자에게 화면과 메시지를 알려 주세요.",
            },
            {
                q: "실수로 잘못 저장했어요",
                a: "개발자에게 요청하면 문서 이력(/admin)에서 이전 내용으로 되돌릴 수 있어요. 어느 화면의 어떤 항목인지, 대략 몇 시쯤 저장했는지 알려 주세요. 각 화면 제목 아래의 &lsquo;마지막 수정&rsquo; 시각이 도움이 돼요.",
            },
        ],
    },
];

export default async function HelpPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="사용 안내" />
            <p className="text-sm text-neutral-600 mb-3 leading-relaxed">
                처음 사용하셔도 괜찮아요. 궁금한 항목을 눌러 펼쳐 보세요.
            </p>
            <p className="text-sm mb-6">
                <Link href="/manage/map" className="font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                    홈페이지의 어느 부분을 어디서 고치는지 한눈에 보기 → 홈페이지 지도
                </Link>
            </p>

            <div className="space-y-8">
                {GROUPS.map((g) => (
                    <section key={g.title} aria-labelledby={`g-${g.title}`}>
                        <h2 id={`g-${g.title}`} className="text-lg font-black tracking-tight mb-3">
                            {g.title}
                        </h2>
                        <div className="space-y-2">
                            {g.items.map((item) => (
                                <details key={item.q} className="group rounded-xl border border-neutral-200 bg-white open:border-neutral-400">
                                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-xl">
                                        <span dangerouslySetInnerHTML={{ __html: item.q }} />
                                        <span aria-hidden="true" className="text-neutral-500 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                                    </summary>
                                    <div className="px-4 pb-4 text-sm text-neutral-700 leading-relaxed">
                                        {typeof item.a === "string" ? <p dangerouslySetInnerHTML={{ __html: item.a }} /> : item.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <OnboardingReset />

            <p className="text-sm text-neutral-500 mt-10 border-t border-neutral-200 pt-4 leading-relaxed">
                이 안내에 없는 문제가 생기면 개발자에게 어느 화면에서 무엇을 하다가 어떤 메시지가 나왔는지 알려 주세요.
            </p>
        </main>
    );
}
