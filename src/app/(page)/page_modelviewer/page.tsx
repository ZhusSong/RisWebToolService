import ObjInspector from "../../components/model-viewer/ObjInspector";
import Link from "next/link";
import { getServerI18n } from "../../../lib/i18n-server";
import LanguageSelector from "../../components/LanguageSelector";

export default async function ModelViewerPage() {
    const { messages } = await getServerI18n();
    const text = messages.modelViewer;

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <Link href="/?category=creative-tools" className="text-sm text-[#435D73] underline-offset-4 hover:underline">
                    ← {text.back}
                </Link>
                <LanguageSelector />
            </header>

            <div>
                <p className="mb-2 text-sm font-medium text-[#526779]">{messages.navigation.creativeTools}</p>
                <h1 className="text-3xl font-semibold tracking-tight text-[#293845]">{text.title}</h1>
            </div>

            <ObjInspector />

            <section aria-labelledby="obj-information" className="rounded-2xl border border-[#E1E5E8] bg-white p-6">
                <h2 id="obj-information" className="text-lg font-semibold text-[#354553]">{text.about}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#526779]">{text.body}</p>
            </section>
        </main>
    );
}
