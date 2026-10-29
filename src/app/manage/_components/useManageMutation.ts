"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { acquireManageMutation, isManageMutationPending, releaseManageMutation, subscribeManageMutation } from "@/lib/manage-mutation-lock";
import { listenForManageHistoryLeave } from "./manageHistoryGuard";

/** 요청과 뒤따르는 React 탐색/새로고침이 끝날 때까지 소유권을 유지한다. */
export function useManageMutationLease(pending: boolean) {
    const isBusy = useSyncExternalStore(subscribeManageMutation, isManageMutationPending, () => false);
    const token = useRef<symbol | null>(null);
    const running = useRef(false);
    const mounted = useRef(false);
    const route = useRef("");
    const [completed, setCompleted] = useState(0);
    const release = () => {
        if (token.current) releaseManageMutation(token.current);
        token.current = null;
    };
    useEffect(() => {
        mounted.current = true;
        const unload = (e: BeforeUnloadEvent) => {
            if (!token.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", unload);
        // 폼이 없는 목록에서도 작업 중인 뒤로/앞으로 이동을 가능한 범위에서 막는다.
        const cleanupHistory = listenForManageHistoryLeave(() => token.current !== null);
        return () => {
            mounted.current = false;
            window.removeEventListener("beforeunload", unload);
            cleanupHistory();
            // 이미 전송된 요청은 취소됐다고 가정하지 않는다. 정착 전까지 새 쓰기를 막는다.
            if (!running.current) release();
        };
    }, []);
    useEffect(() => {
        if (!pending && !running.current) release();
    }, [pending, completed]);

    return {
        isBusy,
        isCurrent: () => mounted.current && token.current !== null && route.current === window.location.pathname + window.location.search,
        acquire: () => {
            if (!mounted.current || token.current) return false;
            const next = acquireManageMutation();
            if (!next) return false;
            token.current = next;
            route.current = window.location.pathname + window.location.search;
            running.current = true;
            return true;
        },
        settle: () => {
            running.current = false;
            if (mounted.current) setCompleted((n) => n + 1);
            else release();
        },
    };
}

export function useManageMutation() {
    const [isPending, startTransition] = useTransition();
    const lease = useManageMutationLease(isPending);
    const run = (work: (isCurrent: () => boolean) => Promise<void>, onStart?: () => void) => {
        if (!lease.acquire()) return false;
        try { onStart?.(); }
        catch (error) { lease.settle(); throw error; }
        startTransition(async () => {
            try { await work(lease.isCurrent); }
            finally { lease.settle(); }
        });
        return true;
    };
    return { isPending, isBusy: lease.isBusy, startTransition, run };
}
