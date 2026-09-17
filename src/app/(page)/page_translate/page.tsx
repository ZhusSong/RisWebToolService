import Link from "next/link";
import Translator from "../../components/Translator";
import PageViewTracker from "../../components/PageViewTracker";
import messages from "../../../messages/zh-CN";

export default function TranslatePage() {
    return (
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
            <PageViewTracker pageName="文本翻译页面" />

            <Link
                href="/"
                className="mb-6 inline-block text-sm text-[#435D73] hover:underline"
            >
                ← {messages.translator.backHome}
            </Link>

            <Translator />
        </main>
    );
}