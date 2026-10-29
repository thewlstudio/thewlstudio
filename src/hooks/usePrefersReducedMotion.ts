"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    media?.addEventListener?.("change", callback);
    return () => media?.removeEventListener?.("change", callback);
}

export function usePrefersReducedMotion() {
    return useSyncExternalStore(subscribe, () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false, () => false);
}
