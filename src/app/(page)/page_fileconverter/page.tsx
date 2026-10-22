import Link from "next/link";
import { getServerI18n } from "../../../lib/i18n-server";
import FileConverter from "../../components/FileConverter";
import PageViewTracker from "../../components/PageViewTracker";

export default async function FileConverterPage() {
    const { t } = await getServerI18n();
    return <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <PageViewTracker pageName="文件格式转换" />
        <Link href="/?category=text-tools" className="mb-6 inline-block text-sm text-blue-700 hover:underline">← {t("返回首页")}</Link>
        <FileConverter />
    </main>;
}
