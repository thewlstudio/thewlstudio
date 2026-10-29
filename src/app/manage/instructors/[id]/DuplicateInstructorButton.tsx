"use client";

import { useEffect, useRef, useState } from "react";
import { useManageMutation } from "../../_components/useManageMutation";
import { useRouter } from "next/navigation";
import { duplicateInstructor } from "../actions";
import { callManageAction } from "../../_components/callManageAction";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";

export default function DuplicateInstructorButton({ documentId }: { documentId: string }) {
    const router = useRouter();
    const { isPending, isBusy, startTransition, run } = useManageMutation();
    const [error, setError] = useState<string | null>(null);
    const requestInFlight = useRef(false);
    useEffect(() => {
        if (!isPending) requestInFlight.current = false;
    }, [isPending]);

    return (
        <div>
            <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                    if (requestInFlight.current || !confirmLeaveIfDirty("저장하지 않은 내용이 있어요. 복제는 마지막 저장 내용을 기준으로 만들어요. 그래도 이동할까요?")) return;
                    run(async (isCurrent) => {
                        requestInFlight.current = true;
                        setError(null);
                        const result = await callManageAction(() => duplicateInstructor(documentId));
                        if (!isCurrent()) return;
                        if (result.ok) {
                            setError(null);
                            startTransition(() => router.push(`/manage/instructors/${result.newId}`));
                        } else {
                            setError(result.error);
                        }
                    });
                }}
                className="text-sm font-semibold text-neutral-600 hover:text-black underline underline-offset-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
            >
                {isPending ? "복제하는 중…" : "복제해서 새로 만들기"}
            </button>
            {error && (
                <p role="alert" className="text-sm font-semibold text-red-600 mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}
