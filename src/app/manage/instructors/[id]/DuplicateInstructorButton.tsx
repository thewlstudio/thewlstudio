"use client";

import { useEffect, useRef, useState } from "react";
import { useManageMutation } from "../../_components/useManageMutation";
import { unstable_rethrow, useRouter } from "next/navigation";
import { duplicateInstructor } from "../actions";
import { callManageAction } from "../../_components/callManageAction";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";
import { isManagedDocumentId } from "@/lib/manage-document-id";
import GuardedLink from "../../_components/GuardedLink";

const CONFIRMED_MOVE_ERROR = "복제는 완료됐지만 수정 화면을 열지 못했어요. 다시 복제하지 말고 아래 링크로 이미 만든 강사를 열어 주세요.";

export default function DuplicateInstructorButton({ documentId }: { documentId: string }) {
    const router = useRouter();
    const { isPending, isBusy, startTransition, run } = useManageMutation();
    const [error, setError] = useState<string | null>(null);
    const [recovery, setRecovery] = useState<{ sourceId: string; copyId: string } | null>(null);
    const copyId = recovery?.sourceId === documentId ? recovery.copyId : null;
    const requestInFlight = useRef(false);
    useEffect(() => {
        if (!isPending) requestInFlight.current = false;
    }, [isPending]);

    return (
        <div>
            <button
                type="button"
                disabled={isBusy || copyId !== null}
                onClick={() => {
                    if (copyId !== null || requestInFlight.current || !confirmLeaveIfDirty("저장하지 않은 내용이 있어요. 복제는 마지막 저장 내용을 기준으로 만들어요. 그래도 이동할까요?")) return;
                    run(async (isCurrent) => {
                        requestInFlight.current = true;
                        setError(null);
                        const result = await callManageAction(() => duplicateInstructor(documentId), (value) => value.ok && Object.hasOwn(value, "newId") && isManagedDocumentId(value.newId) && value.newId !== documentId);
                        if (!isCurrent()) return;
                        if (result.ok) {
                            setError(null);
                            startTransition(() => {
                                try { router.push(`/manage/instructors/${result.newId}`); }
                                catch (error) {
                                    unstable_rethrow(error);
                                    if (isCurrent()) setRecovery({ sourceId: documentId, copyId: result.newId });
                                }
                            });
                        } else {
                            setError(result.error);
                        }
                    });
                }}
                className="text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
            >
                {isPending ? "복제하는 중…" : copyId !== null ? "복제 완료" : "복제해서 새로 만들기"}
            </button>
            {(copyId !== null || error) && (
                <p role="alert" className="text-sm font-semibold text-red-600 mt-1">
                    {copyId !== null ? CONFIRMED_MOVE_ERROR : error}
                </p>
            )}
            {copyId !== null && (
                <GuardedLink href={`/manage/instructors/${copyId}`} className="inline-block mt-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                    복제된 강사 열기
                </GuardedLink>
            )}
        </div>
    );
}
