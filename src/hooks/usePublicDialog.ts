"use client";

import { useCallback, useLayoutEffect, type RefObject } from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";

const inertOwners = new WeakMap<HTMLElement, { original: string | null; tokens: Set<symbol> }>();
const dialogs: symbol[] = [];
const hiddenDialogs = new WeakMap<HTMLElement, { visibility: string; priority: string }>();

// Suspense는 바깥 페이지를 숨겨도 body의 Portal까지 숨기지는 않는다.
function hideDialog(root: HTMLElement) {
    if (!hiddenDialogs.has(root)) hiddenDialogs.set(root, {
        visibility: root.style.getPropertyValue("visibility"), priority: root.style.getPropertyPriority("visibility"),
    });
    // display는 React Suspense도 직접 관리하므로 서로 덮어쓰지 않는다.
    root.style.setProperty("visibility", "hidden", "important");
}
function revealDialog(root: HTMLElement) {
    const saved = hiddenDialogs.get(root);
    if (!saved) return;
    // 숨김 중 다른 코드가 바꾼 표시 상태는 덮어쓰지 않는다.
    if (root.style.getPropertyValue("visibility") === "hidden" && root.style.getPropertyPriority("visibility") === "important") {
        if (saved.visibility) root.style.setProperty("visibility", saved.visibility, saved.priority);
        else root.style.removeProperty("visibility");
    }
    hiddenDialogs.delete(root);
}

function lockBackground(element: HTMLElement, token: symbol) {
    let entry = inertOwners.get(element);
    if (!entry) {
        entry = { original: element.getAttribute("inert"), tokens: new Set() };
        inertOwners.set(element, entry);
    }
    entry.tokens.add(token);
    element.setAttribute("inert", "");
    return () => {
        const current = inertOwners.get(element);
        if (!current || !current.tokens.delete(token) || current.tokens.size) return;
        if (current.original === null) element.removeAttribute("inert");
        else element.setAttribute("inert", current.original);
        inertOwners.delete(element);
    };
}

function focusable(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'))
        .filter((element) => {
            if (element.tabIndex < 0 || element.matches(":disabled") || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
            for (let node: HTMLElement | null = element; node; node = node.parentElement) {
                const style = getComputedStyle(node);
                if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
                if (node === root) break;
            }
            return true;
        });
}

/** Portal의 실제 표시 수명(퇴장 애니메이션 포함) 동안 배경·키보드·포커스를 보호한다. */
export function usePublicDialog({ active, dialogRef, portalRef, triggerRef, initialFocus, onClose, restoreFocus }: {
    active: boolean;
    dialogRef: RefObject<HTMLElement | null>;
    portalRef?: RefObject<HTMLElement | null>;
    triggerRef: RefObject<HTMLElement | null>;
    initialFocus: string;
    onClose: () => void;
    restoreFocus?: () => boolean;
}) {
    useBodyScrollLock(active);
    const restore = useCallback(() => {
        const trigger = triggerRef.current;
        if ((!restoreFocus || restoreFocus()) && trigger?.isConnected && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true });
    }, [triggerRef, restoreFocus]);
    // 먼저 해제돼야 아래 포커스 정리에서 트리거가 다시 포커스 가능한 상태다.
    // 일반 effect는 Suspense의 숨김 동안 살아 있으므로 실제 표시 수명에 맞춘다.
    useLayoutEffect(() => {
        if (!active) return;
        const token = Symbol("public-dialog-background");
        const releases = [document.getElementById("main-content"), document.getElementById("skip-link")]
            .filter((node): node is HTMLElement => node !== null)
            .map((node) => lockBackground(node, token));
        return () => releases.forEach((release) => release());
    }, [active]);

    useLayoutEffect(() => {
        if (!active) return;
        const root = dialogRef.current;
        if (!root) return;
        const portal = portalRef?.current ?? root;
        revealDialog(portal);
        const token = Symbol("public-dialog-focus");
        dialogs.push(token);
        const topmost = () => dialogs[dialogs.length - 1] === token;
        const moveInside = () => (focusable(root).find((node) => node.matches(initialFocus)) ?? focusable(root)[0] ?? root).focus();
        const key = (event: KeyboardEvent) => {
            if (!topmost()) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                onClose();
            } else if (event.key === "Tab") {
                const items = focusable(root);
                const first = items[0] ?? root;
                const last = items[items.length - 1] ?? root;
                const current = document.activeElement;
                if (!root.contains(current) || current === root || (event.shiftKey ? current === first : current === last)) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                }
            }
        };
        const focus = (event: FocusEvent) => {
            if (topmost() && !root.contains(event.target as Node)) moveInside();
        };
        document.addEventListener("keydown", key, true);
        document.addEventListener("focusin", focus);
        moveInside(); // rAF가 정지한 탭에서도 즉시 접근 가능한 대화상자가 된다.
        return () => {
            hideDialog(portal);
            document.removeEventListener("keydown", key, true);
            document.removeEventListener("focusin", focus);
            const index = dialogs.indexOf(token);
            if (index !== -1) dialogs.splice(index, 1);
            restore();
        };
    }, [active, dialogRef, portalRef, initialFocus, onClose, restore]);
}
