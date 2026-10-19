"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveSettings, type SaveResult } from "./actions";
import { Section, Field, ErrorSummary, inputClass } from "../_components/FormParts";
import { useGuardedForm } from "../_components/useGuardedForm";
import { mapEmbedUrl, type SiteSettings } from "@/lib/site-settings";

function ContactFormInner({ data, onDiscard }: { data: SiteSettings; onDiscard: () => void }) {
    const [state, formAction, isPending] = useActionState<SaveResult | null, FormData>(saveSettings, null);
    const [mapQuery, setMapQuery] = useState(data.mapQuery);
    const [shownQuery, setShownQuery] = useState(data.mapQuery);
    const { isDirty, markDirty, summaryRef, handleListClick } = useGuardedForm(state);

    return (
        <form action={formAction} onChange={markDirty} className="space-y-5 pb-32">
            {state && !state.ok && state.fields && state.fields.length > 0 && <ErrorSummary fields={state.fields} summaryRef={summaryRef} />}

            <Section step={1} title="위치·연락처" hint="Contact 페이지에 나오는 정보예요. 모든 칸은 비울 수 없습니다.">
                <Field label="전화번호" htmlFor="phone" required hint="예: 0507-1331-7285 (누르면 전화가 걸려요)">
                    <input id="phone" name="phone" type="tel" defaultValue={data.phone} className={inputClass} />
                </Field>
                <Field label="한글 주소" htmlFor="addressKo" required>
                    <input id="addressKo" name="addressKo" defaultValue={data.addressKo} className={inputClass} />
                </Field>
                <Field label="영문 주소" htmlFor="addressEn" required>
                    <input id="addressEn" name="addressEn" defaultValue={data.addressEn} className={inputClass} />
                </Field>
            </Section>

            <Section step={2} title="지도" hint="구글 지도에 표시할 위치를 주소로 적어 주세요. 지도 코드(iframe)는 넣지 마세요 — 주소만 있으면 홈페이지가 알아서 지도를 만듭니다.">
                <Field label="지도 검색어" htmlFor="mapQuery" required hint="예: 서울특별시 광진구 능동로 413-1">
                    <input id="mapQuery" name="mapQuery" value={mapQuery} onChange={(e) => setMapQuery(e.target.value)} className={inputClass} />
                </Field>
                <div>
                    <button
                        type="button"
                        onClick={() => setShownQuery(mapQuery)}
                        className="h-10 px-4 rounded-lg border-2 border-black text-sm font-bold hover:bg-black hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        지도 미리보기 갱신
                    </button>
                    <div className="mt-3 aspect-[16/9] rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                        {shownQuery.trim() ? (
                            <iframe src={mapEmbedUrl(shownQuery.trim())} title="지도 미리보기" loading="lazy" className="w-full h-full border-0" />
                        ) : (
                            <p className="h-full flex items-center justify-center text-sm text-neutral-400">검색어를 입력해 주세요.</p>
                        )}
                    </div>
                    <p className="text-sm text-neutral-500 mt-2 leading-relaxed">저장 전에도 미리 볼 수 있어요. 위치가 이상하면 주소를 더 자세히 적어 보세요.</p>
                </div>
            </Section>

            <Section step={3} title="링크" hint="모두 https://로 시작하는 주소여야 하고, 아래 안내된 사이트의 주소만 받습니다.">
                <Field label="네이버 지도 장소 주소" htmlFor="naverMapPlaceUrl" required hint="Contact 페이지의 'Open in Naver Map' 버튼 (naver.com 주소)">
                    <input id="naverMapPlaceUrl" name="naverMapPlaceUrl" type="url" inputMode="url" defaultValue={data.naverMapPlaceUrl} className={inputClass} />
                </Field>
                <Field label="네이버 예약 주소" htmlFor="naverReservationUrl" required hint="스튜디오·클래스의 예약, 멤버십 버튼 (naver.com 주소)">
                    <input id="naverReservationUrl" name="naverReservationUrl" type="url" inputMode="url" defaultValue={data.naverReservationUrl} className={inputClass} />
                </Field>
                <Field label="인스타그램 주소" htmlFor="instagramUrl" required hint="헤더의 인스타그램 아이콘 (instagram.com 주소)">
                    <input id="instagramUrl" name="instagramUrl" type="url" inputMode="url" defaultValue={data.instagramUrl} className={inputClass} />
                </Field>
                <Field label="블로그 주소" htmlFor="blogUrl" required hint="스튜디오 페이지 아래의 블로그 링크">
                    <input id="blogUrl" name="blogUrl" type="url" inputMode="url" defaultValue={data.blogUrl} className={inputClass} />
                </Field>
            </Section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-neutral-200 px-5 py-3">
                {isDirty && <p className="max-w-2xl mx-auto text-sm font-bold text-amber-700 mb-1">저장하지 않은 변경사항이 있어요</p>}
                <p className="max-w-2xl mx-auto text-sm text-neutral-600 mb-2">저장하면 홈페이지에 바로 반영됩니다.</p>
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/manage" onClick={handleListClick} className="h-12 px-5 rounded-xl border border-neutral-300 font-bold text-sm flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                        허브
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
export default function ContactForm({ data }: { data: SiteSettings }) {
    const [resetKey, setResetKey] = useState(0);
    return <ContactFormInner key={resetKey} data={data} onDiscard={() => setResetKey((k) => k + 1)} />;
}
