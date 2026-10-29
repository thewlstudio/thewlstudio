"use client";

import { useCallback } from "react";
import type { Transition } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** CSS만으로 멈출 수 없는 Motion의 지연·반복·스프링도 즉시 전환으로 대체한다. */
export function usePublicMotion() {
    const reduced = usePrefersReducedMotion();
    const transitionFor = useCallback((transition: Transition): Transition => reduced
        ? { type: false, duration: 0, delay: 0, repeat: 0, repeatDelay: 0, delayChildren: 0 }
        : transition, [reduced]);
    return { reduced, transitionFor };
}
