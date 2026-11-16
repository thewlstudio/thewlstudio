"use server";

import { redirect } from "next/navigation";
import { draftMode } from "next/headers";
import { destroySession } from "@/lib/manage-auth";

/** /manage 전역에서 공유하는 로그아웃 액션 */
export async function logout() {
    await destroySession();
    (await draftMode()).disable();
    redirect("/manage/login");
}
