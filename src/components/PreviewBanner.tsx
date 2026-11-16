import { isManagedPreview } from "@/lib/manage-preview";
import PreviewBannerView from "./PreviewBannerView";

/** 관리자 미리보기 중일 때만 보이는 안내 띠. 일반 방문자에게는 아무것도 그리지 않는다. */
export default async function PreviewBanner() {
    if (!(await isManagedPreview())) return null;
    return <PreviewBannerView />;
}
