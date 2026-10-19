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
import { createClient } from "@sanity/client";

const apply = process.argv.includes("--apply");

const ROOM_A = {
    name: "W.L Studio [A Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "삼익 업라이트 피아노 su-121",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커",
        "문 커튼",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다."],
    images: ["/images/room_a_3.jpg", "/images/room_a_2.jpg", "/images/room_a_1.jpg"],
};

const ROOM_B = {
    name: "W.L Studio [B Room]",
    prices: [
        { label: "기본", value: "5,000", unit: "원 / 1H" },
        { label: "회원", value: "2,000", unit: "원 / 1H" },
    ],
    features: [
        "야마하 P - 115",
        "공기청정기",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공",
        "유튜브 및 영상 작업에 용이한 조명 설치 완료",
        "블루투스 스피커",
        "문 커튼",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"],
    images: ["/images/room_b_3.jpg", "/images/room_b_2.jpg", "/images/room_b_1.jpg"],
};

const ROOM_C = {
    name: "W.L Studio [C Room]",
    prices: [
        { label: "기본", value: "7,000", unit: "원 / 1H" },
        { label: "회원", value: "4,000", unit: "원 / 1H" },
    ],
    features: [
        "SAMICK UPRIGHT PIANO (삼익 업라이트 피아노)",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "데스크 비치",
        "1~3명까지 수용 가능",
        "냉방과 온풍 가능한 방",
    ],
    notes: [
        "* 방음문 : C룸은 들어갈때 기준으로 비밀번호 입력 후 문을 아래로 내려주시고 두번째 문은 열때 올려주시면 됩니다. 닫을 때는 문을 꾹 밀어주시고 반대로 해주시면 됩니다.",
    ],
    images: ["/images/room_c_2.jpg", "/images/room_c_3.jpg"],
};

const ROOM_D = {
    name: "W.L Studio [D Room]",
    prices: [
        { label: "기본", value: "6,000", unit: "원 / 1H" },
        { label: "회원", value: "3,000", unit: "원 / 1H" },
    ],
    features: [
        "업라이트피아노",
        "24시간 공기청정기 가동 및 숯 비치 (주기적 필터 교체)",
        "보면대 비치",
        "철저한 방음을 위해 2중 도어 & 더블 방음 시공 완료",
        "유튜브 및 영상작업에 용이한 조명 설치 완료 (백색, 핀 조명, 무드 등)",
        "1~3명까지 수용 가능한 방",
        "블루투스 스피커",
    ],
    notes: ["* 방음문: 열때는 아래로, 문 닫고 잠글때는 위로 올려주면 소리가 더 차음됩니다. :)"],
    images: ["/images/room_d_1.jpg", "/images/room_d_2.jpg", "/images/room_d_3.jpg"],
};

const LOBBY = {
    name: "Study Together, 함께 성장하는 공간",
    subtitle: "로비 & 1인 데스크",
    prices: [{ label: "이용 금액", value: "1,000", unit: "원 / 1H" }],
    description:
        "저는 사람이 같이 있을 때 시너지가 난다고 생각합니다. 혼자 공부하거나, 뭔가를 계획하려고 할 때, 집에서는 늘어지고 카페에서는 제한된 시간이 아쉽다고 생각한적이 많아서 준비하게 되었어요. 공부를 하시는 분들, 사업 계획서나 개인 업무를 준비하는 분들, 각자 자신만의 목표를 이루고 싶은 분들이 편하게 오셔서 몰입할 수 있는 공간을 만들고 싶었습니다. 시간에 얽매이지 않고, 원하는 때 집중할 수 있는 환경이 되길 바라며 이곳을 준비했습니다.",
    features: [
        "24시간 연중무휴 운영",
        "로비데스크 & 중앙 로비 1인 데스크 & 소파 이용 가능",
        "음식 주문 가능 (음식물 관련 규정은 추후 조정 예정)",
        "모든 이용객에게 커피 & 티 제공 (셀프 서비스)",
    ],
    notes: [
        "* 스터디 집중을 위해 서로 방해되지 않도록 조용한 분위기 유지",
        "* 개별 음악 연습방 이용 불가",
        "* 원활한 운영을 위해 예약 후 노쇼(No-Show) 금지",
    ],
    images: ["/images/lobby_1.jpg", "/images/lobby_2.jpg"],
};

const SPACES = [
    { id: "studioSpace-room-a", kind: "room", data: ROOM_A },
    { id: "studioSpace-room-b", kind: "room", data: ROOM_B },
    { id: "studioSpace-room-c", kind: "room", data: ROOM_C },
    { id: "studioSpace-room-d", kind: "room", data: ROOM_D },
    { id: "studioSpace-lobby", kind: "lobby", data: LOBBY },
] as const;

const key = (prefix: string, i: number) => `${prefix}${String(i + 1).padStart(2, "0")}`;

async function main() {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"));
    const client = createClient({
        projectId: "antidcuz",
        dataset: "production",
        apiVersion: "2024-01-01",
        token: cfg.authToken,
        useCdn: false,
    });

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
