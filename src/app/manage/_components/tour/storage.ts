"use client";

/**
 * 화면 안내(투어)의 "이미 봤는지 / 자동 안내 끄기" 기록. 브라우저 localStorage에만 저장한다.
 * 키 끝의 _v1을 올리면 모든 사용자에게 안내를 다시 보여줄 수 있다.
 */
const SEEN_KEY = "wls_tour_seen_v1";
const OFF_KEY = "wls_tour_auto_off_v1";
const EVT = "wls-tour-change";

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}
function write(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* 저장소를 못 쓰면 이번 방문에서만 유지된다 */
    }
    window.dispatchEvent(new Event(EVT));
}

export const tourStorage = {
    hasSeen: (id: string) => read<string[]>(SEEN_KEY, []).includes(id),
    markSeen: (id: string) => {
        const seen = read<string[]>(SEEN_KEY, []);
        if (!seen.includes(id)) write(SEEN_KEY, [...seen, id]);
    },
    isAutoOff: () => read<boolean>(OFF_KEY, false),
    setAutoOff: (v: boolean) => write(OFF_KEY, v),
    resetAll: () => {
        write(SEEN_KEY, []);
        write(OFF_KEY, false);
    },
};
