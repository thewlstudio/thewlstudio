"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { randomUUID } from "crypto";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const INFO_ID = "studioInfo";
const LIMITS = { rows: 20, lines: 50, line: 300, text: 3000 } as const;

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
/** 줄바꿈은 화면에서 줄바꿈으로 쓰이므로 \r\n만 통일하고 내용은 그대로 둔다 */
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const lines = (v: unknown) => list(v, LIMITS.lines).map((x) => text(x, LIMITS.line)).filter(Boolean);
const key = (v: unknown) => (typeof v === "string" && v && !v.startsWith("new-") ? v.slice(0, 40) : randomUUID().slice(0, 12));

export async function saveStudioInfo(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        let p: Raw;
        try {
            const parsed = JSON.parse(String(formData.get("dataJson") ?? ""));
            if (!isObj(parsed)) throw new Error();
            p = parsed;
        } catch {
            return { ok: false, error: "입력 내용을 읽지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요." };
        }

        const services = list(p.services, LIMITS.rows).filter(isObj).map((s) => ({
            _key: key(s._key),
            title: text(s.title, LIMITS.line),
            price: text(s.price, 100),
            priceUnit: text(s.priceUnit, 100),
            points: lines(s.points),
        }));
        if (services.some((s) => !s.title)) {
            return { ok: false, error: "서비스 제목을 입력해 주세요. (필요 없는 서비스는 '지우기'를 눌러 주세요.)", fields: [{ id: "services", label: "서비스" }] };
        }

        const equipment = list(p.equipment, LIMITS.rows).filter(isObj).map((e) => ({ _key: key(e._key), title: text(e.title, LIMITS.line), items: lines(e.items) }));
        if (equipment.some((e) => !e.title)) {
            return { ok: false, error: "장비 묶음 제목을 입력해 주세요. (필요 없는 묶음은 '지우기'를 눌러 주세요.)", fields: [{ id: "equipment", label: "장비" }] };
        }

        const memberships = list(p.memberships, LIMITS.rows).filter(isObj).map((m) => ({
            _key: key(m._key),
            num: text(m.num, 10),
            label: text(m.label, 100),
            sub: text(m.sub, 100),
            price: text(m.price, 50),
        }));
        if (memberships.some((m) => !m.label || !m.price)) {
            return { ok: false, error: "멤버십의 이름과 금액을 입력해 주세요. (필요 없는 항목은 '지우기'를 눌러 주세요.)", fields: [{ id: "memberships", label: "멤버십" }] };
        }

        const doc = {
            services,
            equipment,
            memberships,
            membershipNote: text(p.membershipNote, LIMITS.text),
            guidelinesIntro: text(p.guidelinesIntro, LIMITS.text),
            parkingWarning: text(p.parkingWarning, LIMITS.line),
            parkingDetail: text(p.parkingDetail, LIMITS.text),
            parkingFeeLabel: text(p.parkingFeeLabel, 50),
            parkingFee: text(p.parkingFee, LIMITS.line),
            amenities: lines(p.amenities),
            cctvTitle: text(p.cctvTitle, LIMITS.line),
            cctvDetail: text(p.cctvDetail, LIMITS.text),
            dutyText: text(p.dutyText, LIMITS.text),
            dutyWarning: text(p.dutyWarning, LIMITS.line),
        };

        await client.transaction().createIfNotExists({ _id: INFO_ID, _type: "studioInfo" }).patch(INFO_ID, { set: doc }).commit();

        updateTag("studioInfo");
        revalidatePath("/studio");
        return { ok: true };
    } catch (err) {
        console.error("[saveStudioInfo]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}
