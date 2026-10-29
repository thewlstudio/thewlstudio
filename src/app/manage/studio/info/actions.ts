"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { managedWriteError, saveManagedSingleton } from "@/lib/manage-target";
import { studioInfoLimitError } from "@/lib/studio-content-limits";
import { arrayKeyError, managedArrayKey } from "@/lib/manage-array-keys";
import { studioInfoShapeError } from "@/lib/studio-content-shape";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
/** 줄바꿈은 화면에서 줄바꿈으로 쓰이므로 \r\n만 통일하고 내용은 그대로 둔다 */
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const lines = (v: unknown) => list(v).map((x) => text(x)).filter(Boolean);
// 폼 내부 key는 전송하지 않는다. 원본 _key는 그대로, 새 행의 미지정 _key만 서버 발급한다.
const key = (value: unknown) => typeof value === "string" && value ? value : managedArrayKey(value);

export async function saveStudioInfo(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        let p: Raw;
        try {
            const raw = formData.get("dataJson");
            if (typeof raw !== "string" || !raw) throw new Error();
            const parsed: unknown = JSON.parse(raw);
            const shapeError = studioInfoShapeError(parsed);
            if (shapeError) return { ok: false, ...shapeError };
            p = parsed as Raw;
        } catch {
            return { ok: false, error: "입력 내용을 읽지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 새로고침해 주세요.", fields: [{ id: "services", label: "스튜디오 안내" }] };
        }

        const limitError = studioInfoLimitError(p);
        if (limitError) return { ok: false, ...limitError };
        for (const [id, label] of [["services", "서비스"], ["equipment", "장비"], ["memberships", "멤버십"]] as const) {
            const error = arrayKeyError(p[id], label);
            if (error) return { ok: false, error, fields: [{ id, label }] };
        }

        const services = list(p.services).filter(isObj).map((s) => ({
            _key: key(s._key),
            title: text(s.title),
            price: text(s.price),
            priceUnit: text(s.priceUnit),
            points: lines(s.points),
        }));
        if (services.some((s) => !s.title)) {
            return { ok: false, error: "서비스 제목을 입력해 주세요. (필요 없는 서비스는 '지우기'를 눌러 주세요.)", fields: [{ id: "services", label: "서비스" }] };
        }

        const equipment = list(p.equipment).filter(isObj).map((e) => ({ _key: key(e._key), title: text(e.title), items: lines(e.items) }));
        if (equipment.some((e) => !e.title)) {
            return { ok: false, error: "장비 묶음 제목을 입력해 주세요. (필요 없는 묶음은 '지우기'를 눌러 주세요.)", fields: [{ id: "equipment", label: "장비" }] };
        }

        const memberships = list(p.memberships).filter(isObj).map((m) => ({
            _key: key(m._key),
            num: text(m.num),
            label: text(m.label),
            sub: text(m.sub),
            price: text(m.price),
        }));
        if (memberships.some((m) => !m.label || !m.price)) {
            return { ok: false, error: "멤버십의 이름과 금액을 입력해 주세요. (필요 없는 항목은 '지우기'를 눌러 주세요.)", fields: [{ id: "memberships", label: "멤버십" }] };
        }

        const doc = {
            services,
            equipment,
            memberships,
            membershipNote: text(p.membershipNote),
            guidelinesIntro: text(p.guidelinesIntro),
            parkingWarning: text(p.parkingWarning),
            parkingDetail: text(p.parkingDetail),
            parkingFeeLabel: text(p.parkingFeeLabel),
            parkingFee: text(p.parkingFee),
            amenities: lines(p.amenities),
            cctvTitle: text(p.cctvTitle),
            cctvDetail: text(p.cctvDetail),
            dutyText: text(p.dutyText),
            dutyWarning: text(p.dutyWarning),
        };

        await saveManagedSingleton(client, "studioInfo", doc);

        updateTag("studioInfo");
        revalidatePath("/studio");
        return { ok: true };
    } catch (err) {
        console.error("[saveStudioInfo]", err);
        return { ok: false, error: managedWriteError(err) };
    }
}
