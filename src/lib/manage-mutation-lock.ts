"use client";

/** 같은 탭의 관리 쓰기는 대기열 없이 한 번에 하나만 허용한다. */
let owner: symbol | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const isManageMutationPending = () => owner !== null;
export const subscribeManageMutation = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};
export function acquireManageMutation(): symbol | null {
    if (owner) return null;
    owner = Symbol("manage-mutation");
    emit();
    return owner;
}
export function releaseManageMutation(token: symbol) {
    if (owner !== token) return;
    owner = null;
    emit();
}
