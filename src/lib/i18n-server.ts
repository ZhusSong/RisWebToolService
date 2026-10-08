import "server-only";
import { cookies } from "next/headers";
import { getI18n, localeCookie, resolveLocale } from "./i18n";

export async function getServerI18n() {
    return getI18n(resolveLocale((await cookies()).get(localeCookie)?.value));
}
