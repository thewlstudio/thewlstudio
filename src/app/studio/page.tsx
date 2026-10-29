import { sanityFetch } from "@/sanity/lib/client";
import { PUBLIC_STUDIO_SPACE_FILTER } from "@/sanity/lib/queries";
import { STUDIO_CONTENT_ORDER } from "@/lib/content-order";
import { FALLBACK_LOBBY, FALLBACK_ROOMS, type StudioSpaceData } from "@/lib/studio-spaces";
import { FALLBACK_INFO, mergeInfo, type StudioInfo } from "@/lib/studio-info";
import StudioClient from "./StudioClient";

// 공개 공간(연습실·로비)만, 관리 화면에서 정한 순서대로. 휴지통·비공개는 제외한다(관리자 미리보기에서는 비공개 포함).
const spacesQuery = `*[${PUBLIC_STUDIO_SPACE_FILTER}] | order(${STUDIO_CONTENT_ORDER}) {
    kind,
    name,
    subtitle,
    description,
    "prices": coalesce(prices[]{ label, value, unit }, []),
    "features": coalesce(features, []),
    "notes": coalesce(notes, []),
    "images": coalesce(images[].asset->url, [])
}`;

const infoQuery = `*[_type == "studioInfo" && _id == "studioInfo"][0]{
    services[]{ title, price, priceUnit, points },
    equipment[]{ title, items },
    memberships[]{ num, label, sub, price },
    membershipNote, guidelinesIntro, parkingWarning, parkingDetail, parkingFeeLabel, parkingFee,
    amenities, cctvTitle, cctvDetail, dutyText, dutyWarning
}`;

type SpaceRow = StudioSpaceData & { kind?: "room" | "lobby" };

export default async function StudioPage() {
    let rooms: StudioSpaceData[];
    let lobby: StudioSpaceData | null;
    try {
        const spaces = await sanityFetch<SpaceRow[]>({ query: spacesQuery, tags: ["studioSpace"] });
        rooms = spaces.filter((s) => s.kind !== "lobby");
        lobby = spaces.find((s) => s.kind === "lobby") ?? null;
    } catch (err) {
        // 조회에 실패했을 때만 예전 고정값으로 대체한다. (정상 조회에서 비어 있으면 비어 있는 그대로 보여준다)
        console.error("[studio] studioSpace 조회 실패 — 기본값으로 대체", err);
        rooms = FALLBACK_ROOMS;
        lobby = FALLBACK_LOBBY;
    }

    // 서비스·장비·멤버십·이용 안내: 문서가 없거나 조회에 실패하면 기존 고정값으로 대체한다
    let info: StudioInfo;
    try {
        info = mergeInfo(await sanityFetch<Record<string, unknown> | null>({ query: infoQuery, tags: ["studioInfo"] }));
    } catch (err) {
        console.error("[studio] studioInfo 조회 실패 — 기본값으로 대체", err);
        info = FALLBACK_INFO;
    }
    return <StudioClient rooms={rooms} lobby={lobby} info={info} />;
}
