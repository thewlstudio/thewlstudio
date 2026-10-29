import ManageNav from "../ManageNav";
import Link from "./GuardedLink";

export default function ListReadFailure({ title, fields }: { title: string; fields: string[] }) {
    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16">
            <ManageNav title={title} />
            <div role="alert" className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 text-sm leading-relaxed text-red-900">
                <p className="font-bold mb-1">목록을 안전하게 읽지 못했어요</p>
                <p>일부 항목을 숨기거나 다른 대상으로 변경하지 않도록 목록과 변경 버튼을 표시하지 않았어요. 새로고침해도 같으면 아래 항목을 개발자에게 알려 주세요.</p>
                <ul className="list-disc pl-5 mt-2">{fields.map((field) => <li key={field}>{field}</li>)}</ul>
                <Link href="/admin" prefetch={false} className="inline-block mt-3 font-semibold underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">기존 관리 도구에서 원본 확인하기</Link>
            </div>
        </main>
    );
}
