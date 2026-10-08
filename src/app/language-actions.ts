"use server";

import { cookies } from "next/headers";
import { isLocale, localeCookie } from "../lib/i18n";

export async function changeLanguage(value: string) {
    if (!isLocale(value)) throw new Error("Unsupported locale");
    (await cookies()).set(localeCookie, value, {
        path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    });
}
