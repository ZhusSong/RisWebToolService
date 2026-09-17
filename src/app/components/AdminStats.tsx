"use client";

import { useEffect, useState } from "react";

type DailyToolUse = {
    date: string;
    toolName: string;
    uses: number;
};

type Stats = {
    pageViews: number;
    toolUses: number;
    dailyToolUses: DailyToolUse[];
    timeZone: string;
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
                    !("dailyToolUses" in data) ||
                    !("timeZone" in data) ||
                    typeof data.pageViews !== "number" ||
                    typeof data.toolUses !== "number" ||
                    !Array.isArray(data.dailyToolUses) ||
                    typeof data.timeZone !== "string"
                ) {
                    throw new Error("统计数据格式不正确。");
                }

                const dailyToolUses: DailyToolUse[] = data.dailyToolUses.map(
                    (item: unknown) => {
                        if (
                            typeof item !== "object" ||
                            item === null ||
                            !("date" in item) ||
                            !("toolName" in item) ||
                            !("uses" in item) ||
                            typeof item.date !== "string" ||
                            typeof item.toolName !== "string" ||
                            typeof item.uses !== "number" ||
                            !Number.isSafeInteger(item.uses) ||
                            item.uses < 0
                        ) {
                            throw new Error("每日统计数据格式不正确。");
                        }

                        return {
                            date: item.date,
                            toolName: item.toolName,
                            uses: item.uses,
                        };
                    }
                );

                if (!controller.signal.aborted) {
                    setStats({
                        pageViews: data.pageViews,
                        toolUses: data.toolUses,
                        dailyToolUses,
                        timeZone: data.timeZone,
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
        <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
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
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    每日工具使用统计
                </h2>

                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    最近 30 天（含今天），仅显示有使用记录的日期和工具。
                    统计时区：{stats.timeZone}
                </p>

                {stats.dailyToolUses.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                        最近 30 天暂无工具使用记录。
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-900 dark:text-zinc-100">
                            <thead>
                                <tr className="border-b border-zinc-300 dark:border-zinc-700">
                                    <th scope="col" className="px-3 py-3">日期</th>
                                    <th scope="col" className="px-3 py-3">工具</th>
                                    <th scope="col" className="px-3 py-3 text-right">
                                        使用次数
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.dailyToolUses.map((item) => (
                                    <tr
                                        key={JSON.stringify([item.date, item.toolName])}
                                        className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
                                    >
                                        <td className="whitespace-nowrap px-3 py-3">
                                            {item.date}
                                        </td>
                                        <td className="px-3 py-3">{item.toolName}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {item.uses.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}