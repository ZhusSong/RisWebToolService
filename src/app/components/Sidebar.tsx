import Link from "next/link";
import { getServerI18n } from "../../lib/i18n-server";
import Image from "next/image";
import styles from "./Sidebar.module.css";
export default async function Sidebar() {
    const { messages } = await getServerI18n();
    return (
        <aside className="w-full shrink-0 border-b border-zinc-200 bg-[#F5F6F7] p-6 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
            <Link
                href="/"
                className="flex items-center gap-3 text-2xl font-bold tracking-wide text-[#354553]"
            >
                <Image
                    src="/Pictures/logo.png"
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 object-contain"
                />
                <span className="min-w-0 break-words text-xl">{messages.site.name}</span>
            </Link>

            <nav aria-label={messages.navigation.label} className="mt-8 space-y-6">
                <Link
                    href="/"
                    className="block rounded-xl px-4 py-3 text-[#354553] transition-colors hover:bg-[#DCE3E9]"
                >
                    {messages.navigation.home}
                </Link>

                <div>
                    <h2 className="px-4 text-sm font-medium text-zinc-500">
                        {messages.navigation.categories}
                    </h2>

                    <Link
                        href="/?category=text-tools"
                        className={`${styles.websiteToggle} ${styles.textToolLink}`}
                    >
                        <span className={styles.websiteLabel}>
                            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={styles.categoryIcon}>
                                <path d="m3 13 4-10 4 10M4.5 9h5M14 4h7M14 8h7M14 12h7M3 17h18M3 21h18" />
                            </svg>
                            <span>{messages.navigation.textTools}</span>
                        </span>
                    </Link>
                    <details className={styles.websiteMenu}>
                        <summary className={styles.websiteToggle}>
                            <span className={styles.websiteLabel}>
                                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={styles.categoryIcon}>
                                    <rect x="3" y="3" width="8" height="8" rx="2" />
                                    <rect x="13" y="3" width="8" height="8" rx="2" />
                                    <rect x="3" y="13" width="8" height="8" rx="2" />
                                    <rect x="13" y="13" width="8" height="8" rx="2" />
                                </svg>
                                <span>{messages.navigation.websites}</span>
                            </span>
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </summary>
                        <ul className="ml-4 mt-1 space-y-1 border-l border-[#D5DCE2] pl-2">
                            <li>
                                <Link href="/?category=search" className="block rounded-xl px-4 py-2 text-sm text-black transition-colors hover:bg-[#DCE3E9]">
                                    {messages.navigation.searchTools}
                                </Link>
                            </li>
                            <li>
                                <Link href="/?category=ai" className="block rounded-xl px-4 py-2 text-sm text-black transition-colors hover:bg-[#DCE3E9]">
                                    {messages.navigation.aiNavigation}
                                </Link>
                            </li>
                            <li>
                                <Link href="/?category=entertainment" className="block rounded-xl px-4 py-2 text-sm text-black transition-colors hover:bg-[#DCE3E9]">
                                    {messages.navigation.entertainment}
                                </Link>
                            </li>
                        </ul>
                    </details>
                </div>
            </nav>
        </aside>
    );
}