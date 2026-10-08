"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { getI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/i18n";

const LanguageContext = createContext<ReturnType<typeof getI18n> | null>(null);
export default function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
    const value = useMemo(() => getI18n(locale), [locale]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useI18n() {
    const value = useContext(LanguageContext);
    if (!value) throw new Error("LanguageProvider is required");
    return value;
}
