import { sanityFetch } from "@/sanity/lib/client";
import { FALLBACK_LOBBY, FALLBACK_ROOMS, type StudioSpaceData } from "@/lib/studio-spaces";
import StudioClient from "./StudioClient";

// 공개 공간(연습실·로비)만, 관리 화면에서 정한 순서대로. 휴지통·비공개는 제외한다.
const spacesQuery = `*[_type == "studioSpace" && isActive != false && !(trashed == true)] | order(order asc) {
    kind,
    name,
    subtitle,
    description,
    "prices": coalesce(prices[]{ label, value, unit }, []),
    "features": coalesce(features, []),
    "notes": coalesce(notes, []),
    "images": coalesce(images[].asset->url, [])
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
    return <StudioClient rooms={rooms} lobby={lobby} />;
}
