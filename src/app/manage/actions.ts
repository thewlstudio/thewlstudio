"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/manage-auth";

/** /manage 전역에서 공유하는 로그아웃 액션 */
export async function logout() {
    await destroySession();
    redirect("/manage/login");
}
