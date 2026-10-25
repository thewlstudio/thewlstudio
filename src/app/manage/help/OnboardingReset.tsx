"use client";

import { useState } from "react";
import { checklist } from "../_components/checklist/storage";
import { tourStorage } from "../_components/tour/storage";

/** 사용 안내 맨 아래: 처음 설정 체크리스트와 화면 안내를 다시 보이게 한다 */
export default function OnboardingReset() {
    const [msg, setMsg] = useState<string | null>(null);
    const cls =
        "h-11 px-4 rounded-xl border-2 border-neutral-300 text-sm font-bold hover:border-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
    return (
        <section aria-labelledby="reset-title" className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 id="reset-title" className="text-base font-black mb-1">안내 다시 보기</h2>
            <p className="text-sm text-neutral-600 mb-3 leading-relaxed">처음 설정 체크리스트와 화면마다 나오는 말풍선 안내를 처음 상태로 되돌려요. (이 브라우저에서만 적용돼요)</p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    className={cls}
                    onClick={() => {
                        checklist.reset();
                        setMsg("처음 설정을 처음부터 다시 보여드릴게요. 허브에서 확인해 보세요.");
                    }}
                >
                    처음 설정 다시 하기
                </button>
                <button
                    type="button"
                    className={cls}
                    onClick={() => {
                        tourStorage.resetAll();
                        setMsg("화면 안내를 다시 보여드릴게요. 각 화면에 들어가면 처음처럼 안내가 나와요.");
                    }}
                >
                    화면 안내 모두 다시 보기
                </button>
            </div>
            {msg && (
                <p role="status" className="text-sm font-bold text-green-700 mt-3">
                    {msg}
                </p>
            )}
        </section>
    );
}
