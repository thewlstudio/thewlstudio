import type { Metadata } from "next";
import { getSessionExpiry } from "@/lib/manage-auth";
import { ToastProvider } from "./_components/Toast";
import SessionWatcher from "./_components/SessionWatcher";
import { TourProvider } from "./_components/tour/TourProvider";
import ChecklistTracker from "./_components/checklist/ChecklistTracker";

export const metadata: Metadata = {
    title: { default: "홈페이지 관리", template: "%s | 홈페이지 관리" },
    // 관리 화면은 검색엔진에 절대 노출되면 안 된다
    robots: { index: false, follow: false, nocache: true },
};

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
    const expiresAt = await getSessionExpiry();
    // 사이트 본문과 분리된 밝은 배경 — 루트 레이아웃의 검정 배경을 덮는다
    return (
        <div className="bg-neutral-50 text-black min-h-screen">
            <ToastProvider>
                <TourProvider>
                    {children}
                    <ChecklistTracker />
                    {expiresAt && <SessionWatcher expiresAt={expiresAt} />}
                </TourProvider>
            </ToastProvider>
        </div>
    );
}
