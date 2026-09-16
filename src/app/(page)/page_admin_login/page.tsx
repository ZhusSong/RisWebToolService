"use client";

import { useActionState } from "react";
import { loginAdmin } from "./actions";
export default function AdminLoginPage() {
    const [state, formAction, isPending] = useActionState(
        loginAdmin,
        { error: "" }
    );
    return (


        <main className="mx-auto min-h-screen w-full max-w-md px-6 py-12">
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                管理员登录
            </h1>

            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                请输入管理员用户名和密码。
            </p>
            <form action={formAction}>
                <fieldset disabled={isPending}>
            <div className="mt-8">
                <label
                    htmlFor="username"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                    管理员用户名
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    maxLength={64}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
            </div>
            <div className="mt-4">
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                    管理员密码
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={1024}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                </div>
                <button
                    type="submit"
                    disabled={isPending}
                    className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                        {isPending ? "正在登录…" : "登录"}
                    </button>
                </fieldset>
                {state.error && (
                    <p
                        role="alert"
                        className="mt-4 text-sm text-red-600 dark:text-red-400"
                    >
                        {state.error}
                    </p>
                )}
            </form>
        </main>
    );
}