"use client";

/**
 * 폼(InstructorForm 등)의 미저장 변경사항 여부를, 그 폼과 별개로 렌더링되는
 * 상단 내비게이션(ManageNav)이 알 수 있게 공유하는 아주 작은 저장소.
 *
 * React state/context로 만들면 폼과 내비게이션을 하나의 클라이언트 컴포넌트
 * 트리로 묶어야 하는데, 지금 구조상 페이지(서버 컴포넌트)가 ManageNav와
 * InstructorForm을 나란히 렌더링하고 있어 그 둘을 잇기 번거롭다. 모듈
 * 스코프의 값 하나로도 같은 페이지 안에서는 충분히 안전하게 공유된다 —
 * 클라이언트 사이드 라우팅으로 페이지가 바뀌어도 모듈은 그대로 살아있으므로
 * 폼이 언마운트될 때 반드시 false로 리셋해야 한다.
 */
let dirty = false;

export function setFormDirty(value: boolean) {
    dirty = value;
}

export function isFormDirty(): boolean {
    return dirty;
}

/** dirty 상태면 confirm으로 물어보고, 사용자가 "취소"하면 false를 반환한다 */
export function confirmLeaveIfDirty(
    message = "저장하지 않은 내용이 있어요. 그래도 나가시겠어요?",
): boolean {
    if (!dirty) return true;
    return window.confirm(message);
}
