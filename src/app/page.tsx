import Image from "next/image";
import Link from "next/link";
import PageViewTracker from "./components/PageViewTracker";
import messages from "../messages/zh-CN";

const cardClass =
    "group block w-full rounded-2xl border border-[#E1E5E8] " +
    "bg-[#F3F4F5] p-6 transition-all duration-200 ease-out " +
    "motion-safe:hover:-translate-y-1 hover:shadow-lg " +
    "motion-reduce:transition-none hover:border-[#8295A7] " +
    "hover:bg-[#8295A7] focus-visible:outline-2 " +
    "focus-visible:outline-offset-4 focus-visible:outline-[#526779]";

const descriptionClass =
    "mt-2 text-sm leading-6 text-[#465563] group-hover:text-[#1F2B35]";

const openClass =
    "mt-4 inline-block text-sm font-medium text-[#435D73] " +
    "group-hover:text-[#1F2B35]";

export default function Home() {
    return (
        <div className="flex flex-1 flex-col bg-[#FAFBFC] font-sans">
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
                <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
                    <h1 className="text-3xl font-semibold leading-10 tracking-tight text-[#293845]">
                        {messages.site.name}
                    </h1>

                    <p className="max-w-md text-lg leading-8 text-[#526779]">
                        {messages.site.description}
                    </p>
                </div>

                <section
                    id="text-tools"
                    aria-labelledby="text-tools-title"
                    className="w-full scroll-mt-6"
                >
                    <h2
                        id="text-tools-title"
                        className="mb-4 text-lg font-semibold text-[#354553]"
                    >
                        {messages.navigation.textTools}
                    </h2>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <Link
                            href="/page_textcounter"
                            className={cardClass}
                        >
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/Pictures/logo_textcounter.png"
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 shrink-0 rounded-lg object-contain"
                                />

                                <h3 className="text-xl font-semibold text-[#293845]">
                                    {messages.tools.textCounter.title}
                                </h3>
                            </div>

                            <p className={descriptionClass}>
                                {messages.tools.textCounter.description}
                            </p>

                            <span className={openClass}>
                                {messages.tools.textCounter.open} →
                            </span>
                        </Link>

                        <Link
                            href="/page_translate"
                            className={cardClass}
                        >
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/Pictures/logo_translate.png"
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 shrink-0 rounded-lg object-contain"
                                />

                                <h3 className="text-xl font-semibold text-[#293845]">
                                    {messages.tools.translator.title}
                                </h3>
                            </div>

                            <p className={descriptionClass}>
                                {messages.tools.translator.description}
                            </p>

                            <span className={openClass}>
                                {messages.tools.translator.open} →
                            </span>
                        </Link>
                    </div>
                </section>
            </main>

            <PageViewTracker pageName="首页" />
        </div>
    );
}