import TextCounter from "../components/TextCounter";
import Link from "next/link";
export default function TextCounterPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
            <Link
                href="/"
                className="mb-6 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
                ← 返回首页
            </Link>
            <TextCounter />
        </main>
    );
}