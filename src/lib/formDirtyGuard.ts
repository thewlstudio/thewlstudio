"use client";

import { isManageMutationPending } from "./manage-mutation-lock";

/**
 * 폼(InstructorForm 등)의 미저장 변경사항 여부를, 그 폼과 별개로 렌더링되는
 * 상단 내비게이션(ManageNav)·목록/이력 링크가 알 수 있게 공유하는 작은 저장소.
 *
 * React state/context로 만들면 폼과 내비게이션을 하나의 클라이언트 컴포넌트
 * 트리로 묶어야 하는데, 지금 구조상 페이지(서버 컴포넌트)가 ManageNav와
 * InstructorForm을 나란히 렌더링하고 있어 그 둘을 잇기 번거롭다. 모듈
 * 스코프의 값 하나로도 같은 페이지 안에서는 충분히 안전하게 공유된다 —
 * 클라이언트 사이드 라우팅으로 페이지가 바뀌어도 모듈은 그대로 살아있으므로
 * 폼이 언마운트될 때 반드시 false로 리셋해야 한다.
 */
let dirty = false;
let pending = false;

export function setFormDirty(value: boolean) {
    dirty = value;
}

export function isFormDirty(): boolean {
    return dirty;
}

export function setFormPending(value: boolean) {
    pending = value;
}

export function isFormPending(): boolean {
    return pending;
}

/** 저장 중에는 이동을 막고, 미저장 변경은 확인한다. 승인만으로 상태를 지우지는 않는다. */
export function confirmLeaveIfDirty(
    message = "저장하지 않은 내용이 있어요. 그래도 나갈까요?",
): boolean {
    if (isManageMutationPending()) {
        window.alert("처리 중인 작업이 있어요. 완료한 뒤 이동해 주세요.");
        return false;
    }
    if (pending) {
        window.alert("저장 중이에요. 완료한 뒤 이동해 주세요.");
        return false;
    }
    if (!dirty) return true;
    return window.confirm(message);
}
