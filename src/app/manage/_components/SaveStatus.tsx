"use client";

type State = { ok: true } | { ok: false; error: string } | null;

/** 저장 막대 아래의 결과 표시. 로그인 만료는 해결 방법과 함께 따로 안내한다. */
export default function SaveStatus({ state }: { state: State }) {
    if (!state) return null;
    const expired = !state.ok && state.error.includes("인증이 필요");
    return (
        <div className="max-w-2xl mx-auto mt-2" role="status" aria-live="polite">
            {state.ok ? (
                <p className="text-sm font-bold text-green-700">저장했어요. 홈페이지에 바로 반영돼요.</p>
            ) : expired ? (
                <p className="text-sm font-bold text-red-600 leading-relaxed">
                    로그인이 만료돼서 저장하지 못했어요. 작성한 내용은 그대로 있어요.{" "}
                    <a href="/manage/login" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                        새 탭에서 다시 로그인
                    </a>
                    한 뒤 &lsquo;저장하기&rsquo;를 다시 눌러 주세요.
                </p>
            ) : (
                <p className="text-sm font-bold text-red-600">{state.error}</p>
            )}
        </div>
    );
}
