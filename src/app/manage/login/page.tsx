import { redirect } from "next/navigation";
import { createSession, isAuthenticated, isManageConfigured } from "@/lib/manage-auth";

export const metadata = {
    title: "관리자 로그인",
    robots: { index: false, follow: false },
};

async function login(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const ok = await createSession(password);
    if (!ok) {
        redirect("/manage/login?error=1");
    }
    redirect("/manage/instructors");
}

export default async function ManageLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    if (await isAuthenticated()) {
        redirect("/manage/instructors");
    }

    if (!isManageConfigured()) {
        return (
            <main className="min-h-screen bg-neutral-50 text-black flex items-center justify-center px-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
                    <h1 className="text-xl font-bold mb-3">설정이 필요합니다</h1>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        관리자 화면을 쓰려면 환경변수 <code className="bg-neutral-100 px-1.5 py-0.5 rounded">MANAGE_PASSWORD</code> 와{" "}
                        <code className="bg-neutral-100 px-1.5 py-0.5 rounded">MANAGE_SECRET</code> 이 필요합니다.
                        설정 방법은 개발자에게 문의해 주세요.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-black flex items-center justify-center px-6">
            <div className="max-w-sm w-full">
                <div className="text-center mb-8">
                    <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-2">
                        White Light Studio
                    </p>
                    <h1 className="text-2xl font-black tracking-tight">홈페이지 관리</h1>
                </div>

                <form
                    action={login}
                    className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-4"
                >
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold mb-2">
                            비밀번호
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            autoFocus
                            className="w-full h-12 px-4 rounded-xl border border-neutral-300 text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm font-semibold text-red-600">
                            비밀번호가 맞지 않습니다.
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        들어가기
                    </button>
                </form>
            </div>
        </main>
    );
}
