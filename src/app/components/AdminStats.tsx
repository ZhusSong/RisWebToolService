"use client";

import { useEffect, useState } from "react";

type Stats = {
    pageViews: number;
    toolUses: number;
};

export default function AdminStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadStats() {
            try {
                const response = await fetch("/api/analytics", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    throw new Error("登录已过期，请重新登录。");
                }

                if (!response.ok) {
                    throw new Error("统计数据读取失败，请刷新重试。");
                }

                const data: unknown = await response.json();

                if (
                    typeof data !== "object" ||
                    data === null ||
                    !("pageViews" in data) ||
                    !("toolUses" in data) ||
                    typeof data.pageViews !== "number" ||
                    typeof data.toolUses !== "number"
                ) {
                    throw new Error("统计数据格式不正确。");
                }

                if (!controller.signal.aborted) {
                    setStats({
                        pageViews: data.pageViews,
                        toolUses: data.toolUses,
                    });
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "统计数据读取失败。"
                    );
                }
            }
        }

        void loadStats();

        return () => controller.abort();
    }, []);

    if (error) {
        return (
            <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
                {error}
            </p>
        );
    }

    if (!stats) {
        return (
            <p className="mt-6 text-zinc-600 dark:text-zinc-400">
                正在读取统计数据……
            </p>
        );
    }

    return (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm text-zinc-600 dark:text-zinc-400">
                    页面访问次数
                </h2>
                <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {stats.pageViews.toLocaleString()}
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm text-zinc-600 dark:text-zinc-400">
                    工具使用次数
                </h2>
                <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {stats.toolUses.toLocaleString()}
                </p>
            </div>
        </div>
    );
}