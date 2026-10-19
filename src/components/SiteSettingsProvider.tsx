"use client";

import { createContext, useContext } from "react";
import { FALLBACK_SETTINGS, type SiteSettings } from "@/lib/site-settings";

const SiteSettingsContext = createContext<SiteSettings>(FALLBACK_SETTINGS);

/** 루트 레이아웃이 서버에서 읽은 설정을 클라이언트 컴포넌트(헤더·스튜디오·클래스)에 전달한다 */
export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
    return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettings {
    return useContext(SiteSettingsContext);
}
