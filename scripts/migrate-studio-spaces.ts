/**
 * 일회성 이전 스크립트: app/studio/page.tsx에 하드코딩돼 있던 연습실(A~D)·로비 데이터를
 * Sanity의 studioSpace 문서로 옮긴다. 사진은 public/images의 파일을 Sanity 에셋으로 올린다.
 *
 * - 문서 _id가 고정(studioSpace-room-a …)이라 다시 실행해도 이미 있는 문서는 건드리지 않는다(createIfNotExists).
 * - 공개 페이지는 이 데이터를 아직 읽지 않는다(6단계에서 관리 화면과 함께 전환).
 * - 사용: npx tsx scripts/migrate-studio-spaces.ts [--apply]   (기본은 미리보기)
 *   인증은 `sanity login`으로 저장된 CLI 토큰을 쓴다.
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { scriptClient } from "./lib/sanity-client";
import { DEFAULT_LOBBY as LOBBY, DEFAULT_ROOMS } from "../src/config/default-content";

const [ROOM_A, ROOM_B, ROOM_C, ROOM_D] = DEFAULT_ROOMS;

const apply = process.argv.includes("--apply");

const SPACES = [
    { id: "studioSpace-room-a", kind: "room", data: ROOM_A },
    { id: "studioSpace-room-b", kind: "room", data: ROOM_B },
    { id: "studioSpace-room-c", kind: "room", data: ROOM_C },
    { id: "studioSpace-room-d", kind: "room", data: ROOM_D },
    { id: "studioSpace-lobby", kind: "lobby", data: LOBBY },
] as const;

const key = (prefix: string, i: number) => `${prefix}${String(i + 1).padStart(2, "0")}`;

async function main() {
    const client = scriptClient();

    for (const [index, sp] of SPACES.entries()) {
        const d = sp.data as Record<string, any>;
        const exists = await client.fetch<number>(`count(*[_id == $id])`, { id: sp.id });
        if (exists) {
            console.log(`SKIP  ${sp.id} (이미 있음)`);
            continue;
        }
        console.log(`${apply ? "CREATE" : "PLAN  "} ${sp.id}  ${d.name}  사진 ${d.images.length}장`);
        if (!apply) continue;

        const images = [];
        for (const [i, src] of (d.images as string[]).entries()) {
            const asset = await client.assets.upload("image", readFileSync(join(process.cwd(), "public", src)), {
                filename: src.split("/").pop(),
            });
            images.push({ _key: key("img", i), _type: "image", asset: { _type: "reference", _ref: asset._id } });
        }
        await client.createIfNotExists({
            _id: sp.id,
            _type: "studioSpace",
            kind: sp.kind,
            name: d.name,
            ...(d.subtitle ? { subtitle: d.subtitle } : {}),
            prices: d.prices.map((p: any, i: number) => ({ _key: key("price", i), ...p })),
            ...(d.description ? { description: d.description } : {}),
            features: d.features,
            ...(d.notes?.length ? { notes: d.notes } : {}),
            images,
            order: index,
            isActive: true,
            trashed: false,
        });
    }
    console.log(apply ? "완료" : "미리보기 끝 — 실제로 만들려면 --apply");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
