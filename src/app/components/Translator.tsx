"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import messages from "../../messages/zh-CN";
import styles from "./Translator.module.css";

const t = messages.translator;
const MAX_CHARACTERS = 2_000;
const languages = ["zh-CN", "en", "ja"] as const;

type Language = (typeof languages)[number];
type SourceLanguage = Language | "auto";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getErrorMessage(code: unknown): string {
    if (
        typeof code === "string" &&
        Object.prototype.hasOwnProperty.call(t.errors, code)
    ) {
        return t.errors[code as keyof typeof t.errors];
    }

    return t.errors.unavailable;
}

export default function Translator() {
    const [text, setText] = useState("");
    const [source, setSource] = useState<SourceLanguage>("auto");
    const [target, setTarget] = useState<Language>("en");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const activeRequest = useRef<AbortController | null>(null);
    const copyVersion = useRef(0);

    const characterCount = Array.from(text).length;
    const tooLong = characterCount > MAX_CHARACTERS;

    useEffect(() => {
        return () => {
            activeRequest.current?.abort();
            copyVersion.current += 1;
        };
    }, []);

    function resetResult() {
        setResult("");
        setError("");
        setCopied(false);
        copyVersion.current += 1;
    }

    async function translate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // 防止连续点击产生多个请求。
        if (activeRequest.current) {
            return;
        }

        resetResult();

        if (!text.trim()) {
            setError(t.errors.emptyText);
            return;
        }

        if (tooLong) {
            setError(t.errors.textTooLong);
            return;
        }

        if (source === target) {
            setError(t.errors.sameLanguage);
            return;
        }

        const controller = new AbortController();
        activeRequest.current = controller;
        setLoading(true);

        // 比服务端的 15 秒超时稍长，留出网络传输时间。
        const timer = window.setTimeout(() => {
            controller.abort();
        }, 25_000);

        try {
            const response = await fetch("/api/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text, source, target }),
                cache: "no-store",
                signal: controller.signal,
            });

            const data: unknown = await response.json();

            if (controller.signal.aborted) {
                return;
            }

            if (!response.ok) {
                setError(
                    getErrorMessage(isRecord(data) ? data.error : undefined)
                );
                return;
            }

            if (
                !isRecord(data) ||
                typeof data.translatedText !== "string"
            ) {
                setError(t.errors.unavailable);
                return;
            }

            // 译文通过 textarea 的 value 显示，不作为 HTML 执行。
            setResult(data.translatedText);
        } catch {
            if (activeRequest.current === controller) {
                setError(
                    controller.signal.aborted
                        ? t.errors.timeout
                        : t.errors.network
                );
            }
        } finally {
            window.clearTimeout(timer);

            if (activeRequest.current === controller) {
                activeRequest.current = null;
                setLoading(false);
            }
        }
    }

    async function copyResult() {
        const version = ++copyVersion.current;
        setCopied(false);
        setError("");

        try {
            await navigator.clipboard.writeText(result);

            if (copyVersion.current === version) {
                setCopied(true);
            }
        } catch {
            if (copyVersion.current === version) {
                setError(t.errors.copyFailed);
            }
        }
    }

    const fieldClass =
        "w-full rounded-xl border border-[#D5DCE2] bg-white px-4 py-3 " +
        "text-[#293845] outline-none focus:border-[#8295A7] " +
        "focus:ring-2 focus:ring-[#8295A7]/30 disabled:opacity-60";

    const buttonClass =
        "rounded-xl border border-[#D5DCE2] px-5 py-3 text-sm font-medium " +
        "transition-colors hover:bg-[#DCE3E9] " +
        "disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <section
            aria-labelledby="translator-title"
            className="rounded-2xl border border-[#E1E5E8] bg-[#F8F9FA] p-6"
        >
            <h1
                id="translator-title"
                className="text-2xl font-semibold text-[#293845]"
            >
                {t.title}
            </h1>

            <form onSubmit={translate} className="mt-6 space-y-5">
                <fieldset disabled={loading} className="min-w-0">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="min-w-0 space-y-3">
                            <label
                                htmlFor="source-language"
                                className="block text-sm font-medium"
                            >
                                {t.sourceLanguage}
                            </label>

                            <select
                                id="source-language"
                                value={source}
                                onChange={(event) => {
                                    setSource(
                                        event.target.value as SourceLanguage
                                    );
                                    resetResult();
                                }}
                                className={fieldClass}
                            >
                                <option value="auto">{t.languages.auto}</option>
                                {languages.map((language) => (
                                    <option key={language} value={language}>
                                        {t.languages[language]}
                                    </option>
                                ))}
                            </select>

                            <label
                                htmlFor="translation-source"
                                className="block text-sm font-medium"
                            >
                                {t.sourceLabel}
                            </label>

                            <textarea
                                id="translation-source"
                                value={text}
                                onChange={(event) => {
                                    setText(event.target.value);
                                    resetResult();
                                }}
                                placeholder={t.sourcePlaceholder}
                                aria-describedby="translation-limit"
                                aria-invalid={tooLong}
                                className={`${fieldClass} min-h-64 resize-y`}
                            />

                            <p
                                id="translation-limit"
                                className={`text-sm ${tooLong
                                        ? "text-red-600"
                                        : "text-[#526779]"
                                    }`}
                            >
                                {characterCount.toLocaleString()} /{" "}
                                {MAX_CHARACTERS.toLocaleString()}
                                {" · "}
                                {t.characterLimit}
                            </p>
                        </div>

                        <div className="min-w-0 space-y-3">
                            <label
                                htmlFor="target-language"
                                className="block text-sm font-medium"
                            >
                                {t.targetLanguage}
                            </label>

                            <select
                                id="target-language"
                                value={target}
                                onChange={(event) => {
                                    setTarget(event.target.value as Language);
                                    resetResult();
                                }}
                                className={fieldClass}
                            >
                                {languages.map((language) => (
                                    <option key={language} value={language}>
                                        {t.languages[language]}
                                    </option>
                                ))}
                            </select>

                            <label
                                htmlFor="translation-result"
                                className="block text-sm font-medium"
                            >
                                {t.resultLabel}
                            </label>

                            <textarea
                                id="translation-result"
                                value={result}
                                readOnly
                                lang={target}
                                placeholder={t.resultPlaceholder}
                                className={`${fieldClass} min-h-64 resize-y`}
                            />
                        </div>
                    </div>
                </fieldset>

                <div className={styles.actions}>
                    <button
                        type="submit"
                        disabled={loading || !text.trim() || tooLong}
                        className={`${styles.button} ${styles.translate}`}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M4 7h14m-4-4 4 4-4 4" />
                            <path d="M20 17H6m4-4-4 4 4 4" />
                        </svg>
                        {loading ? t.translating : t.translate}
                    </button>

                    <button
                        type="button"
                        disabled={loading || !result}
                        onClick={() => void copyResult()}
                        className={`${styles.button} ${styles.copy}`}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="8" y="8" width="12" height="12" rx="2" />
                            <path d="M16 8V4H4v12h4" />
                        </svg>
                        {copied ? t.copied : t.copy}
                    </button>

                    <button
                        type="button"
                        disabled={loading || (!text && !result)}
                        onClick={() => {
                            setText("");
                            resetResult();
                        }}
                        className={`${styles.button} ${styles.clear}`}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 6h18M9 6V3h6v3" />
                            <path d="m5 6 1 15h12l1-15M10 10v7M14 10v7" />
                        </svg>
                        {t.clear}
                    </button>
                </div>

                {error && (
                    <p role="alert" className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <p role="status" className="sr-only">
                    {loading ? t.translating : copied ? t.copied : ""}
                </p>
            </form>

            <div className="mt-6 space-y-2 border-t border-[#E1E5E8] pt-4 text-sm leading-6 text-[#526779]">
                <p>{t.provider}</p>
                <p>{t.privacy}</p>
            </div>
        </section>
    );
}