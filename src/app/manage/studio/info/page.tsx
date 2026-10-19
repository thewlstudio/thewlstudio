import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { isAuthenticated } from "@/lib/manage-auth";
import { isWriteConfigured } from "@/sanity/lib/writeClient";
import { mergeInfo } from "@/lib/studio-info";
import ManageNav from "../../ManageNav";
import StudioInfoForm from "./StudioInfoForm";
import UpdatedAt from "../../_components/UpdatedAt";

export const metadata = { title: "스튜디오 안내 관리" };
export const dynamic = "force-dynamic";

const query = `*[_type == "studioInfo" && _id == "studioInfo"][0]{
    _updatedAt,
    services[]{ title, price, priceUnit, points },
    equipment[]{ title, items },
    memberships[]{ num, label, sub, price },
    membershipNote, guidelinesIntro, parkingWarning, parkingDetail, parkingFeeLabel, parkingFee,
    amenities, cctvTitle, cctvDetail, dutyText, dutyWarning
}`;

export default async function StudioInfoPage() {
    if (!(await isAuthenticated())) redirect("/manage/login");

    // 문서가 없으면 홈페이지가 실제로 쓰는 값(기본값)으로 채워서 보여준다
    const raw = await client.fetch<Record<string, unknown> | null>(query);
    const data = mergeInfo(raw);
    const writeReady = isWriteConfigured();

    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title="스튜디오 안내 관리" />
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">서비스·장비·멤버십·이용 안내</h2>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                    스튜디오 페이지의 연습실·로비 카드를 뺀 나머지 내용이에요. (연습실·로비는 목록에서 따로 관리해요.)
                </p>
                <UpdatedAt iso={raw?._updatedAt as string | undefined} historyHref={`/manage/history/studio-info/studioInfo`} />
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
            <StudioInfoForm data={data} />
        </main>
    );
}
