import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/manage-auth";

// /manage 로 들어오면 로그인 여부에 따라 알맞은 곳으로 자동 이동시킨다.
export default async function ManageIndexPage() {
    if (await isAuthenticated()) {
        redirect("/manage/instructors");
    }
    redirect("/manage/login");
}
