// /manage/instructors, /manage/instructors/[id], /manage/instructors/new
// 셋 다 이 하위 세그먼트에 속해서, 자체 loading.tsx가 없는 한 이 화면을 함께 쓴다.
export default function InstructorsLoading() {
    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-10 md:py-16 animate-pulse">
            <div className="mb-8">
                <div className="h-2.5 w-24 bg-neutral-200 rounded mb-2" />
                <div className="h-8 w-32 bg-neutral-200 rounded" />
            </div>

            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-200 p-4"
                    >
                        <div className="w-14 h-14 rounded-xl bg-neutral-100 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-1/2 bg-neutral-200 rounded" />
                            <div className="h-3 w-1/3 bg-neutral-100 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
