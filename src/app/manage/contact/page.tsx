import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import { FALLBACK_SETTINGS, mergeSettings } from "@/lib/site-settings";
import ManageNav from "../ManageNav";
import ContactForm from "./ContactForm";
import UpdatedAt from "../_components/UpdatedAt";

export const metadata = { title: "연락처·링크 관리" };
export const dynamic = "force-dynamic";

const query = `*[_type == "siteSettings" && _id == "siteSettings"][0]{ _updatedAt, phone, addressKo, addressEn, mapQuery, naverMapPlaceUrl, naverReservationUrl, instagramUrl, blogUrl, homeHeadline, homeIntro }`;

export default async function ManageContactPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    const raw = await client.fetch<Record<string, unknown> | null>(query);
    // 문서가 없거나 비어 있는 항목은 홈페이지가 실제로 쓰는 값(기본값)으로 채워서 보여준다
    const data = raw ? mergeSettings(raw) : FALLBACK_SETTINGS;
    const writeReady = isWriteConfigured();

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="연락처·링크 관리" />
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">연락처·링크</h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">Contact 페이지, 헤더의 인스타그램, 예약·멤버십 버튼, 블로그 링크, 홈페이지 소개 문구에 쓰이는 정보예요.</p>
                <UpdatedAt iso={raw?._updatedAt as string | undefined} historyHref={`/manage/history/contact/siteSettings`} />
            </div>
            {!writeReady && (
                <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed">
                    <p className="font-bold mb-1">아직 저장 기능이 켜지지 않았어요</p>
                    <p className="text-neutral-700">
                        내용은 볼 수 있지만, 저장하려면 Sanity 쓰기 토큰 설정이 필요해요. 개발자에게{" "}
                        <code className="bg-white/70 px-1 rounded">SANITY_API_WRITE_TOKEN</code> 설정을 요청해 주세요.
                    </p>
                </div>
            )}
            <ContactForm data={data} />
        </main>
    );
}
