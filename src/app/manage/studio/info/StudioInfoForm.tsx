"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveStudioInfo, type SaveResult } from "./actions";
import { Section, Field, ErrorSummary, inputClass, textareaClass } from "../../_components/FormParts";
import { useGuardedForm } from "../../_components/useGuardedForm";
import { LinesEditor, dangerBtn, dashedBtn, move, smallBtn } from "../../_components/listUi";
import type { StudioInfo } from "@/lib/studio-info";

let seq = 0;
const newKey = () => `new-${Date.now().toString(36)}-${++seq}`;

type Keyed<T> = T & { key: string };
const withKeys = <T,>(rows: T[], prefix: string): Keyed<T>[] => rows.map((r, i) => ({ ...r, key: `${prefix}-${i}` }));

/** 한 행의 ▲▼·지우기 */
function RowTools({ name, i, count, onMove, onRemove }: { name: string; i: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
    return (
        <div className="flex items-center">
            <button type="button" aria-label={`${name} ${i + 1} 위로`} disabled={i === 0} onClick={() => onMove(i - 1)} className={smallBtn}>▲</button>
            <button type="button" aria-label={`${name} ${i + 1} 아래로`} disabled={i === count - 1} onClick={() => onMove(i + 1)} className={smallBtn}>▼</button>
            <button
                type="button"
                aria-label={`${name} ${i + 1} 지우기`}
                onClick={() => {
                    if (window.confirm(`${name} ${i + 1}을(를) 지울까요? 저장하기 전에는 홈페이지에 반영되지 않고, '변경 버리기'로 되돌릴 수 있어요.`)) onRemove();
                }}
                className={dangerBtn}
            >
                지우기
            </button>
        </div>
    );
}

function StudioInfoFormInner({ data, onDiscard }: { data: StudioInfo; onDiscard: () => void }) {
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(saveStudioInfo, null);
    const { isDirty, markDirty, summaryRef, handleListClick } = useGuardedForm(state);

    const [services, setServices] = useState(() => withKeys(data.services, "svc"));
    const [equipment, setEquipment] = useState(() => withKeys(data.equipment, "eq"));
    const [memberships, setMemberships] = useState(() => withKeys(data.memberships, "mem"));
    const [text, setText] = useState({
        membershipNote: data.membershipNote,
        guidelinesIntro: data.guidelinesIntro,
        parkingWarning: data.parkingWarning,
        parkingDetail: data.parkingDetail,
        parkingFeeLabel: data.parkingFeeLabel,
        parkingFee: data.parkingFee,
        cctvTitle: data.cctvTitle,
        cctvDetail: data.cctvDetail,
        dutyText: data.dutyText,
        dutyWarning: data.dutyWarning,
    });
    const [amenities, setAmenities] = useState(data.amenities);

    const set = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        markDirty();
    };
    const setT = (k: keyof typeof text) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setText((t) => ({ ...t, [k]: e.target.value }));
        markDirty();
    };

    const dataJson = JSON.stringify({
        services: services.map((s) => ({ _key: s.key, title: s.title, price: s.price, priceUnit: s.priceUnit, points: s.points })),
        equipment: equipment.map((e) => ({ _key: e.key, title: e.title, items: e.items })),
        memberships: memberships.map((m) => ({ _key: m.key, num: m.num, label: m.label, sub: m.sub, price: m.price })),
        ...text,
        amenities,
    });

    return (
        <form action={formAction} onChange={markDirty} className="space-y-5 pb-32">
            <input type="hidden" name="dataJson" value={dataJson} />
            {state && !state.ok && state.fields && state.fields.length > 0 && <ErrorSummary fields={state.fields} summaryRef={summaryRef} />}

            <Section step={1} title="서비스" hint="페이지 위쪽의 검은 배경 카드(예: 보컬 레코딩)예요. 서비스가 2개일 때 가장 보기 좋아요.">
                <div id="services" tabIndex={-1} className="space-y-4 focus:outline-none">
                    {services.map((s, i) => {
                        const upd = (patch: Partial<typeof s>) => set(setServices)(services.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
                        return (
                            <div key={s.key} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold">서비스 {i + 1}</p>
                                    <RowTools name="서비스" i={i} count={services.length} onMove={(to) => set(setServices)(move(services, i, to))} onRemove={() => set(setServices)(services.filter((_, idx) => idx !== i))} />
                                </div>
                                <Field label="제목" htmlFor={`svc-title-${s.key}`} required>
                                    <input id={`svc-title-${s.key}`} value={s.title} onChange={(e) => upd({ title: e.target.value })} className={inputClass} />
                                </Field>
                                <Field label="가격" htmlFor={`svc-price-${s.key}`} hint="예: 100,000 KRW 또는 Contact for Quote">
                                    <input id={`svc-price-${s.key}`} value={s.price} onChange={(e) => upd({ price: e.target.value })} className={inputClass} />
                                </Field>
                                <Field label="가격 단위" htmlFor={`svc-unit-${s.key}`} hint="가격 옆에 작게 나와요. 예: / 2 Hours (없으면 비워두세요)">
                                    <input id={`svc-unit-${s.key}`} value={s.priceUnit} onChange={(e) => upd({ priceUnit: e.target.value })} className={inputClass} />
                                </Field>
                                <div>
                                    <p className="text-sm font-bold mb-2">설명 줄</p>
                                    <LinesEditor lines={s.points} onChange={(points) => upd({ points })} label="설명" placeholder="예: 디렉팅 및 기초적인 튠 포함" />
                                </div>
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => set(setServices)([...services, { key: newKey(), title: "", price: "", priceUnit: "", points: [] }])} className={dashedBtn}>+ 서비스 추가</button>
                </div>
            </Section>

            <Section step={2} title="장비" hint="EQUIPMENT 영역의 묶음(마이크, 아웃보드 등)과 그 안의 장비 이름이에요.">
                <div id="equipment" tabIndex={-1} className="space-y-4 focus:outline-none">
                    {equipment.map((g, i) => {
                        const upd = (patch: Partial<typeof g>) => set(setEquipment)(equipment.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
                        return (
                            <div key={g.key} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold">장비 묶음 {i + 1}</p>
                                    <RowTools name="장비 묶음" i={i} count={equipment.length} onMove={(to) => set(setEquipment)(move(equipment, i, to))} onRemove={() => set(setEquipment)(equipment.filter((_, idx) => idx !== i))} />
                                </div>
                                <Field label="묶음 제목" htmlFor={`eq-title-${g.key}`} required hint="예: Microphones. 데스크톱에서 줄을 바꾸고 싶으면 Enter로 줄을 나눠 적으세요.">
                                    <textarea id={`eq-title-${g.key}`} rows={2} value={g.title} onChange={(e) => upd({ title: e.target.value })} className={textareaClass} />
                                </Field>
                                <div>
                                    <p className="text-sm font-bold mb-2">장비 이름</p>
                                    <LinesEditor lines={g.items} onChange={(items) => upd({ items })} label="장비" placeholder="예: Neumann U87 Ai" />
                                </div>
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => set(setEquipment)([...equipment, { key: newKey(), title: "", items: [] }])} className={dashedBtn}>+ 장비 묶음 추가</button>
                </div>
            </Section>

            <Section step={3} title="멤버십" hint="MEMBERSHIP 영역의 회원권 카드예요. 3개일 때 가장 보기 좋아요.">
                <div id="memberships" tabIndex={-1} className="space-y-4 focus:outline-none">
                    {memberships.map((m, i) => {
                        const upd = (patch: Partial<typeof m>) => set(setMemberships)(memberships.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
                        return (
                            <div key={m.key} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold">회원권 {i + 1}</p>
                                    <RowTools name="회원권" i={i} count={memberships.length} onMove={(to) => set(setMemberships)(move(memberships, i, to))} onRemove={() => set(setMemberships)(memberships.filter((_, idx) => idx !== i))} />
                                </div>
                                <Field label="원 안의 숫자" htmlFor={`mem-num-${m.key}`} hint="예: 1">
                                    <input id={`mem-num-${m.key}`} value={m.num} onChange={(e) => upd({ num: e.target.value })} className={inputClass} />
                                </Field>
                                <Field label="이름" htmlFor={`mem-label-${m.key}`} required hint="예: 1개월 회원권">
                                    <input id={`mem-label-${m.key}`} value={m.label} onChange={(e) => upd({ label: e.target.value })} className={inputClass} />
                                </Field>
                                <Field label="영문 이름" htmlFor={`mem-sub-${m.key}`} hint="예: 1 Month Pass">
                                    <input id={`mem-sub-${m.key}`} value={m.sub} onChange={(e) => upd({ sub: e.target.value })} className={inputClass} />
                                </Field>
                                <Field label="금액" htmlFor={`mem-price-${m.key}`} required hint="예: 40,000 (뒤에 '원'이 자동으로 붙어요)">
                                    <input id={`mem-price-${m.key}`} value={m.price} onChange={(e) => upd({ price: e.target.value })} className={inputClass} />
                                </Field>
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => set(setMemberships)([...memberships, { key: newKey(), num: "", label: "", sub: "", price: "" }])} className={dashedBtn}>+ 회원권 추가</button>
                </div>
                <Field label="멤버십 안내 문구" htmlFor="membershipNote" hint="카드 아래에 나와요. Enter로 줄을 나누면 데스크톱에서 줄이 바뀝니다.">
                    <textarea id="membershipNote" rows={3} value={text.membershipNote} onChange={setT("membershipNote")} className={textareaClass} />
                </Field>
            </Section>

            <Section step={4} title="이용 안내" hint="GUIDELINES & AMENITIES 영역이에요.">
                <Field label="소개 문구" htmlFor="guidelinesIntro" hint="Enter로 줄을 나누면 데스크톱에서 줄이 바뀝니다.">
                    <textarea id="guidelinesIntro" rows={5} value={text.guidelinesIntro} onChange={setT("guidelinesIntro")} className={textareaClass} />
                </Field>

                <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <p className="text-sm font-black">주차 (Parking)</p>
                    <Field label="붉은 강조 문구" htmlFor="parkingWarning" hint="예: 주차가 불가합니다.">
                        <input id="parkingWarning" value={text.parkingWarning} onChange={setT("parkingWarning")} className={inputClass} />
                    </Field>
                    <Field label="안내 문구" htmlFor="parkingDetail" hint="Enter로 줄을 나누면 줄이 바뀝니다.">
                        <textarea id="parkingDetail" rows={3} value={text.parkingDetail} onChange={setT("parkingDetail")} className={textareaClass} />
                    </Field>
                    <Field label="요금 라벨" htmlFor="parkingFeeLabel" hint="예: 요금">
                        <input id="parkingFeeLabel" value={text.parkingFeeLabel} onChange={setT("parkingFeeLabel")} className={inputClass} />
                    </Field>
                    <Field label="요금" htmlFor="parkingFee" hint="예: 10분 400원 / 1시간 2,400원">
                        <input id="parkingFee" value={text.parkingFee} onChange={setT("parkingFee")} className={inputClass} />
                    </Field>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <p className="text-sm font-black">편의시설 (Amenities)</p>
                    <LinesEditor lines={amenities} onChange={set(setAmenities)} label="편의시설" placeholder="예: 냉·온·얼음 정수기" />
                </div>

                <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <p className="text-sm font-black">보안·이용 수칙 (Security &amp; Duty)</p>
                    <Field label="CCTV 제목" htmlFor="cctvTitle">
                        <input id="cctvTitle" value={text.cctvTitle} onChange={setT("cctvTitle")} className={inputClass} />
                    </Field>
                    <Field label="CCTV 설명" htmlFor="cctvDetail">
                        <textarea id="cctvDetail" rows={3} value={text.cctvDetail} onChange={setT("cctvDetail")} className={textareaClass} />
                    </Field>
                    <Field label="이용 수칙" htmlFor="dutyText">
                        <textarea id="dutyText" rows={2} value={text.dutyText} onChange={setT("dutyText")} className={textareaClass} />
                    </Field>
                    <Field label="붉은 강조 수칙" htmlFor="dutyWarning" hint="예: 파손시 배상 요청드립니다.">
                        <input id="dutyWarning" value={text.dutyWarning} onChange={setT("dutyWarning")} className={inputClass} />
                    </Field>
                </div>
            </Section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">저장하면 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage/studio" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        목록
                    </Link>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("변경한 내용을 모두 버릴까요? 되돌릴 수 없습니다.")) onDiscard();
                            }}
                            className="h-12 px-4 rounded-xl border border-neutral-300 font-bold text-sm hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            변경 버리기
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 h-12 rounded-xl bg-black text-white font-bold disabled:opacity-50 hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        {isPending ? "저장하는 중…" : "저장하기"}
                    </button>
                </div>
                {state && (
                    <div className="max-w-2xl mx-auto mt-2" role="status" aria-live="polite">
                        {state.ok ? <p className="text-sm font-bold text-green-700">저장했습니다. 홈페이지에 바로 반영됩니다.</p> : <p className="text-sm font-bold text-red-600">{state.error}</p>}
                    </div>
                )}
            </div>
        </form>
    );
}

/** "변경 버리기"를 누르면 key를 바꿔 폼 전체를 최신 data로 다시 마운트한다 */
export default function StudioInfoForm({ data }: { data: StudioInfo }) {
    const [resetKey, setResetKey] = useState(0);
    return <StudioInfoFormInner key={resetKey} data={data} onDiscard={() => setResetKey((k) => k + 1)} />;
}
