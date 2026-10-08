import zhCN from "../messages/zh-CN";
import en from "../messages/en";
import ja from "../messages/ja";
import { ui } from "../messages/ui";

export const locales = ["zh-CN", "en", "ja"] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = "tuotuo-locale";
export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && locales.some(locale => locale === value);
}
export function resolveLocale(value: unknown): Locale {
    return isLocale(value) ? value : "zh-CN";
}
const dictionaries = { "zh-CN": zhCN, en, ja };
export function getI18n(locale: Locale) {
    const phrases: Record<string, string> = ui[locale];
    return {
        locale,
        messages: dictionaries[locale],
        t: (key: string, values: Record<string, string | number> = {}) =>
            (phrases[key] ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
                Object.hasOwn(values, name) ? String(values[name]) : match),
    };
}
