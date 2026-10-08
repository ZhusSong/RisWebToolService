"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { changeLanguage } from "../language-actions";
import { useI18n } from "./LanguageProvider";
import styles from "./LanguageSelector.module.css";

const choices = [
    { locale: "zh-CN", name: "中文", icon: "chinese.png" },
    { locale: "en", name: "English", icon: "english.png" },
    { locale: "ja", name: "日本語", icon: "japanese.png" },
] as const;

export default function LanguageSelector() {
    const { locale, t } = useI18n();
    const [pending, startTransition] = useTransition();
    const [failed, setFailed] = useState(false);
    return <div>
        <div className={styles.choices} role="group" aria-label={t("选择语言")} aria-busy={pending}>
            {choices.map(choice => <button type="button" key={choice.locale}
                lang={choice.locale} aria-pressed={locale === choice.locale}
                disabled={pending} className={styles.choice}
                onClick={() => {
                    if (locale === choice.locale) return;
                    setFailed(false);
                    startTransition(async () => {
                        try { await changeLanguage(choice.locale); }
                        catch { setFailed(true); }
                    });
                }}>
                <Image src={`/Pictures/${choice.icon}`} alt="" width={24} height={24} className={styles.icon} />
                <span>{choice.name}</span>
            </button>)}
        </div>
        <span role="status" className="sr-only">{pending ? t("正在切换语言…") : ""}</span>
        {failed && <p role="alert" className="mt-2 text-sm text-red-600">{t("语言切换失败，请重试。")}</p>}
    </div>;
}
