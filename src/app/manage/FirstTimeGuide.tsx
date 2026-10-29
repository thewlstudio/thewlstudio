"use client";

import Link from "./_components/GuardedLink";
import { useSyncExternalStore } from "react";

const KEY = "wls_manage_guide_dismissed";

/** 허브 첫 화면의 "처음 오셨나요?" 안내. 닫으면 이 브라우저에서는 다시 나타나지 않는다(사용 안내 페이지는 언제든 열 수 있음). */
const EVT = "wls-guide-change";
const subscribe = (cb: () => void) => {
    window.addEventListener(EVT, cb);
    window.addEventListener("storage", cb);
    return () => {
        window.removeEventListener(EVT, cb);
        window.removeEventListener("storage", cb);
    };
};
const readDismissed = () => {
    try {
        return localStorage.getItem(KEY) === "1";
    } catch {
        return false;
    }
};

export default function FirstTimeGuide() {
    // 서버에서는 숨긴 상태로 그리고, 브라우저에서 저장된 값을 읽어 보여준다 (깜빡임·불일치 방지)
    const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
    if (dismissed) return null;

    return (
        <section aria-labelledby="first-guide" className="mb-6 rounded-2xl border border-neutral-300 bg-white p-5">
            <h2 id="first-guide" className="text-base font-black mb-3">
                처음 오셨나요? 이 세 가지만 기억하세요
            </h2>
            <ol className="space-y-2.5 text-sm text-neutral-700 leading-relaxed">
                <li className="flex gap-3">
                    <span aria-hidden="true" className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>아래에서 고칠 항목을 고르고, 목록에서 수정할 내용을 눌러요.</span>
                </li>
                <li className="flex gap-3">
                    <span aria-hidden="true" className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>고친 뒤 화면 아래의 <b>저장하기</b>를 누르면 홈페이지에 바로 반영돼요. 누르기 전에는 바뀌지 않아요.</span>
                </li>
                <li className="flex gap-3">
                    <span aria-hidden="true" className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>실수해도 괜찮아요. 삭제는 <b>휴지통</b>으로 가서 <b>되돌리기</b>가 되고, 잠깐 숨기려면 <b>비공개</b>를 쓰세요.</span>
                </li>
            </ol>
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <Link
                    href="/manage/help"
                    className="h-10 px-4 rounded-lg border-2 border-black text-sm font-bold flex items-center hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    자세한 사용 안내 보기
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        try {
                            localStorage.setItem(KEY, "1");
                        } catch {
                            /* 저장소를 못 쓰면 닫아도 다시 나타난다 */
                        }
                        window.dispatchEvent(new Event(EVT));
                    }}
                    className="h-10 px-3 text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                >
                    알겠어요, 다시 보지 않기
                </button>
            </div>
        </section>
    );
}
