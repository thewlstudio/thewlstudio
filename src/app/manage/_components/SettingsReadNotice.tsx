import type { SettingsReadState } from "@/lib/manage-settings-read";
import Link from "./GuardedLink";

/** 원본 값 대신 고정된 항목 이름과 읽기 상태만 보여준다. */
export default function SettingsReadNotice({ state, subject = "설정" }: { state: SettingsReadState; subject?: "설정" | "내용" }) {
    if (state.kind === "ready") return null;
    const blocked = state.kind === "blocked";
    return (
        <div role={blocked ? "alert" : "status"} className={`mb-6 rounded-2xl border p-5 text-sm leading-relaxed ${blocked ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
            <p className="font-bold mb-1">{blocked ? `저장된 ${subject === "설정" ? "설정을" : "내용을"} 안전하게 읽지 못했어요` : state.kind === "new" ? "아직 저장된 설정이 없어요" : "일부 항목을 기본값 또는 빈 값으로 보여드려요"}</p>
            <p>{blocked ? `원본을 ${subject === "설정" ? "기본값으로 덮어쓰지" : "잘못 바꾸지"} 않도록 편집 폼을 열지 않았어요. 새로고침해도 같으면 아래 항목을 개발자에게 알려 주세요.` : state.kind === "new" ? "홈페이지에서 사용하는 기본값을 채워 두었어요. 처음 저장하면 새 설정 문서가 만들어져요." : "저장된 값이 없는 항목을 채워 두었어요. 저장하면 표시된 기본값이나 빈 값도 함께 저장돼요."}</p>
            {state.fields.length > 0 && <ul className="list-disc pl-5 mt-2">{state.fields.map((field) => <li key={field}>{field}</li>)}</ul>}
            {blocked && <Link href="/admin" prefetch={false} className="inline-block mt-3 font-semibold underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">기존 관리 도구에서 원본 확인하기</Link>}
        </div>
    );
}
