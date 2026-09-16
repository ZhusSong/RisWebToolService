import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "../../../lib/admin-auth";
import { logoutAdmin } from "./actions";
import AdminStats from "../../components/AdminStats";

export default async function AdminPage() {
    if (!(await isAdminAuthenticated())) {
        redirect("/page_admin_login");
    }

    return (
        <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                管理员统计
            </h1>

            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                以下为累计事件次数，包含测试记录，不代表独立访客人数。
            </p>
            <AdminStats />
            <form action={logoutAdmin} className="mt-6">
                <button
                    type="submit"
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                    退出登录
                </button>
            </form>
        </main>
    );
}