"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import messages from "../../messages/zh-CN";
import styles from "./Translator.module.css";

type Language = "zh-CN" | "en" | "ja";
const voiceLanguages: Record<Language, string> = {
    "zh-CN": "zh-CN",
    en: "en-US",
    ja: "ja-JP",
};

function availableVoice(language: Language): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();
    const requested = voiceLanguages[language].toLowerCase();
    return voices.find((voice) => voice.lang.toLowerCase() === requested)
        ?? voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === requested.split("-")[0]);
}

function subscribeVoices(onChange: () => void) {
    if (!("speechSynthesis" in window)) return () => {};
    const synth = window.speechSynthesis;
    synth.addEventListener("voiceschanged", onChange);
    // Some browsers start loading voices only after this first call.
    synth.getVoices();
    return () => synth.removeEventListener("voiceschanged", onChange);
}

function serverSnapshot() {
    return "checking" as const;
}

export default function SpeechControls({ text, language }: {
    text: string;
    language: Language;
}) {
    const t = messages.translator.speech;
    const [speaking, setSpeaking] = useState(false);
    const [error, setError] = useState("");
    const utterance = useRef<SpeechSynthesisUtterance | null>(null);

    const getSnapshot = useCallback(() => {
        if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
            return "unsupported";
        }
        if (window.speechSynthesis.getVoices().length === 0) return "loadingVoices";
        return availableVoice(language) ? "ready" : "missingVoice";
    }, [language]);

    const availability = useSyncExternalStore(subscribeVoices, getSnapshot, serverSnapshot);

    const cancelOwnedSpeech = useCallback(() => {
        if (utterance.current) {
            utterance.current.onend = null;
            utterance.current.onerror = null;
            utterance.current = null;
            window.speechSynthesis.cancel();
        }
    }, []);

    useEffect(() => () => cancelOwnedSpeech(), [cancelOwnedSpeech]);

    function stop() {
        cancelOwnedSpeech();
        setSpeaking(false);
    }

    function speak() {
        if (availability !== "ready" || !text.trim()) return;
        cancelOwnedSpeech();
        setError("");
        const voice = availableVoice(language);
        if (!voice) {
            setError(t.missingVoice);
            return;
        }

        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = voiceLanguages[language];
        speech.voice = voice;
        speech.rate = 1;
        utterance.current = speech;
        speech.onend = () => {
            if (utterance.current !== speech) return;
            utterance.current = null;
            setSpeaking(false);
        };
        speech.onerror = () => {
            if (utterance.current !== speech) return;
            utterance.current = null;
            setSpeaking(false);
            setError(t.failed);
        };

        try {
            window.speechSynthesis.speak(speech);
            setSpeaking(true);
        } catch {
            cancelOwnedSpeech();
            setSpeaking(false);
            setError(t.failed);
        }
    }

    const availabilityMessage = availability === "unsupported" ? t.unsupported
        : availability === "missingVoice" ? t.missingVoice
        : availability === "loadingVoices" ? t.loadingVoices : "";

    return (
        <div className={styles.speechArea}>
            <div className={styles.actions}>
                <button type="button" onClick={speak}
                    disabled={availability !== "ready" || speaking}
                    className={`${styles.button} ${styles.read}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
                    </svg>
                    {t.read}
                </button>
                <button type="button" onClick={stop} disabled={!speaking}
                    className={`${styles.button} ${styles.clear}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    {t.stop}
                </button>
            </div>
            <p role="status" className={styles.speechHint}>
                {error || (speaking ? t.speaking : availabilityMessage || t.hint)}
            </p>
        </div>
    );
}
