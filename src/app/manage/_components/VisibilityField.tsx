"use client";

/** 저장 막대 위 한 줄 안내. 공개면 바로 반영, 비공개면 홈페이지에 안 나온다고 알려 준다. */
export function saveNote(isCreate: boolean, isActive: boolean): string {
    const verb = isCreate ? "추가" : "저장";
    return isActive ? `${verb}하면 홈페이지에 바로 반영돼요.` : `${verb}해도 홈페이지에는 안 나와요. (비공개)`;
}

/** 비공개일 때 폼 맨 위에 보이는 안내. `where`는 "홈페이지 크루 목록"처럼 이 항목이 나오는 자리. */
export function VisibilityBanner({ isActive, where }: { isActive: boolean; where: string }) {
    if (isActive) return null;
    return (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            지금 비공개 상태예요. 저장해도 {where}에는 나오지 않아요. 저장한 뒤 &lsquo;홈페이지에서 미리보기&rsquo;로 확인할 수 있어요.
        </div>
    );
}

/** 강사·Crew·Works·Studio 공통 "공개 상태" 선택. 문구와 모양을 한 곳에서 맞춘다. */
export function VisibilityField({ isActive, onChange, where }: { isActive: boolean; onChange: (next: boolean) => void; where: string }) {
    return (
        <fieldset data-tour="form-visibility">
            <legend className="text-sm font-bold mb-1.5">공개 상태</legend>
            <p className="text-sm text-neutral-600 mb-2 leading-relaxed">
                <strong>비공개</strong>로 저장하면 {where}에는 나오지 않고, 저장한 뒤 &lsquo;홈페이지에서 미리보기&rsquo;로만 볼 수 있어요. 먼저 확인하고 공개하고 싶을 때, 또는 잠시 빼고 싶을 때(삭제 대신) 써 주세요.
            </p>
            <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                    <button
                        key={String(v)}
                        type="button"
                        aria-pressed={isActive === v}
                        onClick={() => onChange(v)}
                        className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${isActive === v ? "bg-black text-white border-black" : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"}`}
                    >
                        {v ? "공개" : "비공개"}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}
