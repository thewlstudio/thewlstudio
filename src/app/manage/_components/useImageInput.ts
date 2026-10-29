"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { prepareImageFile, replaceInputFile } from "./imageUpload";

/** 파일 입력·미리보기는 항상 같은 파일을 가리킨다. 늦게 끝난 이전 선택은 버린다. */
export function useImageInput(onPreview?: (url: string | null) => void) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const sequence = useRef(0);

    useEffect(() => () => { sequence.current++; }, []);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const picked = input.files?.[0];
        const ticket = ++sequence.current;
        delete input.dataset.imageError;
        setError(null);
        setPreview(null);
        onPreview?.(null);
        if (!picked) {
            delete input.dataset.imageProcessing;
            setProcessing(false);
            return;
        }
        // React 상태 갱신 전 Ctrl+S가 와도 제출 검사에서 감지할 수 있게 즉시 표시한다.
        input.dataset.imageProcessing = "true";
        setProcessing(true);
        const current = () => ticket === sequence.current && input.isConnected;
        const fail = (message: string) => {
            input.value = "";
            input.dataset.imageError = message;
            setError(message);
        };
        try {
            const prepared = await prepareImageFile(picked);
            if (!current() || input.files?.[0] !== picked) return;
            if ("error" in prepared) {
                fail(prepared.error);
                return;
            }
            if (!replaceInputFile(input, prepared.file)) {
                fail("이 브라우저에서 사진을 준비하지 못했어요. 작은 사진을 다시 고르거나 다른 브라우저를 이용해 주세요.");
                return;
            }
            const url = URL.createObjectURL(prepared.file);
            setPreview(url);
            onPreview?.(url);
        } catch {
            if (current()) fail("사진을 준비하지 못했어요. 다시 골라 주세요.");
        } finally {
            if (ticket === sequence.current && input.isConnected) {
                delete input.dataset.imageProcessing;
                setProcessing(false);
            }
        }
    };

    return { preview, error, processing, onChange };
}
