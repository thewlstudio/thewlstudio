"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { hideAudioPresentation, showAudioPresentation, updateAudioPresentation } from "@/lib/audio-presentation";

const START_EVENT = "wls:audio-request";
type Playback = { source: string; phase: "idle" | "loading" | "playing" | "paused" | "error"; progress: number; duration: number; error: string | null };
const initial = (source: string): Playback => ({ source, phase: "idle", progress: 0, duration: 0, error: null });
const playableDuration = (value: number) => Number.isFinite(value) && value > 0;

export function useWorkAudio(source: string, title?: string) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const desired = useRef(false);
    const generation = useRef(0);
    const titleRef = useRef(title);
    const invalidate = useCallback(() => {
        desired.current = false;
        generation.current++;
    }, []);
    const [state, setState] = useState(() => initial(source));
    const shown = state.source === source ? state : initial(source);
    const update = useCallback((patch: Partial<Playback>) => {
        setState((previous) => ({ ...(previous.source === source ? previous : initial(source)), ...patch }));
    }, [source]);
    useEffect(() => {
        titleRef.current = title;
        if (audioRef.current) updateAudioPresentation(audioRef.current, title);
    }, [title]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const pause = () => {
            // Ignore an old pause event if a newer request has already resumed the element.
            if (!audio.paused) return;
            invalidate();
            update({ phase: "paused" });
            hideAudioPresentation(audio);
        };
        const playing = () => {
            if (!desired.current) { audio.pause(); return; }
            update({ phase: "playing", error: null });
            showAudioPresentation(audio, titleRef.current);
        };
        const metadata = () => update({ duration: playableDuration(audio.duration) ? audio.duration : 0 });
        const time = () => {
            if (!playableDuration(audio.duration) || !Number.isFinite(audio.currentTime)) return;
            update({ duration: audio.duration, progress: Math.min(100, Math.max(0, audio.currentTime / audio.duration * 100)) });
            const left = audio.duration - audio.currentTime;
            audio.volume = left > 0 && left <= 5 ? left / 5 : 1;
        };
        const ended = () => {
            invalidate();
            update({ phase: "idle", progress: 0 });
            audio.currentTime = 0;
            audio.volume = 1;
            hideAudioPresentation(audio);
        };
        const failed = () => {
            invalidate();
            if (!audio.paused) audio.pause();
            update({ phase: "error", error: "오디오를 재생하지 못했어요. 잠시 뒤 다시 시도해 주세요." });
            hideAudioPresentation(audio);
        };
        const otherRequested = (event: Event) => {
            if ((event as CustomEvent<HTMLAudioElement>).detail === audio) return;
            invalidate();
            if (!audio.paused) audio.pause();
            update({ phase: "paused" });
            hideAudioPresentation(audio);
        };
        audio.addEventListener("playing", playing);
        audio.addEventListener("pause", pause);
        audio.addEventListener("ended", ended);
        audio.addEventListener("timeupdate", time);
        audio.addEventListener("durationchange", metadata);
        audio.addEventListener("loadedmetadata", metadata);
        audio.addEventListener("error", failed);
        window.addEventListener(START_EVENT, otherRequested);
        return () => {
            invalidate();
            audio.removeEventListener("playing", playing);
            audio.removeEventListener("pause", pause);
            audio.removeEventListener("ended", ended);
            audio.removeEventListener("timeupdate", time);
            audio.removeEventListener("durationchange", metadata);
            audio.removeEventListener("loadedmetadata", metadata);
            audio.removeEventListener("error", failed);
            window.removeEventListener(START_EVENT, otherRequested);
            if (!audio.paused) audio.pause();
            audio.volume = 1;
            hideAudioPresentation(audio);
        };
    }, [source, update, invalidate]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (desired.current || !audio.paused) {
            desired.current = false;
            generation.current++;
            audio.pause();
            update({ phase: "paused" });
            hideAudioPresentation(audio);
            return;
        }
        const ticket = ++generation.current;
        desired.current = true;
        window.dispatchEvent(new CustomEvent(START_EVENT, { detail: audio }));
        update({ phase: "loading", error: null });
        try {
            if (audio.error) {
                audio.load();
                update({ duration: 0, progress: 0 });
            }
            await audio.play();
            if (!audio.isConnected || !desired.current) {
                if (!audio.paused) audio.pause();
                return;
            }
            if (ticket !== generation.current) return;
            if (desired.current && !audio.paused) {
                update({ phase: "playing" });
                showAudioPresentation(audio, titleRef.current);
            }
        } catch {
            if (ticket !== generation.current || !audio.isConnected) return;
            desired.current = false;
            update({ phase: "error", error: "오디오를 재생하지 못했어요. 잠시 뒤 다시 시도해 주세요." });
            hideAudioPresentation(audio);
        }
    };

    const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        const value = Number(event.currentTarget.value);
        if (!audio || !playableDuration(audio.duration) || !Number.isFinite(value)) return;
        const progress = Math.min(100, Math.max(0, value));
        audio.currentTime = progress / 100 * audio.duration;
        update({ progress });
    };
    return { audioRef, isPlaying: shown.phase === "playing", isLoading: shown.phase === "loading", progress: shown.progress, canSeek: playableDuration(shown.duration), error: shown.error, togglePlay, handleSeek };
}
