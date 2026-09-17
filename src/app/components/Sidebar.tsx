import Link from "next/link";
import messages from "../../messages/zh-CN";
import Image from "next/image";
export default function Sidebar() {
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
                <span className="whitespace-nowrap">{messages.site.name}</span>
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
                        href="/#text-tools"
                        className="mt-2 block rounded-xl px-4 py-3 text-[#354553] transition-colors hover:bg-[#DCE3E9]"
                    >
                        {messages.navigation.textTools}
                    </Link>
                </div>
            </nav>
        </aside>
    );
}