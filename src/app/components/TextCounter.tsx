"use client";
import { useRef, useState } from "react";
import * as mammoth from "mammoth";
export default function TextCounter() {
    const [text, setText] = useState("");
    const hasRecordedUse = useRef(false);
    const latestUseRequest = useRef<symbol | null>(null);
    const recordToolUse = () => {
        if (hasRecordedUse.current) return;

        const requestId = Symbol();
        latestUseRequest.current = requestId;
        hasRecordedUse.current = true;

        void fetch("/api/analytics", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventType: "tool_use",
                toolName: "文本字数统计",
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`统计请求失败：${response.status}`);
                }
            })
            .catch((error) => {
                if (latestUseRequest.current === requestId) {
                    hasRecordedUse.current = false;
                }

                console.warn("本次使用统计未确认成功：", error);
            });
    };
    return (
        <div className="flex w-full flex-col items-start gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-base font-medium dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                文本字数统计
            </h2>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-zinc-50 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-blue-500 dark:hover:bg-zinc-800">
                选择本地文件
                <input
                    type="file"
                    accept=".txt,.docx"
                    onChange={async (event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;

                        try {
                            const fileName = file.name.toLowerCase();
                            let content = "";

                            if (fileName.endsWith(".txt")) {
                                content = await file.text();
                            } else if (fileName.endsWith(".docx")) {
                                const arrayBuffer = await file.arrayBuffer();
                                const result = await mammoth.extractRawText({
                                    arrayBuffer,
                                });
                                content = result.value;
                            } else {
                                alert("请选择 TXT 或 DOCX 文件。");
                                return;
                            }

                            setText(content);

                            if (content.trim().length > 0) {
                                recordToolUse();
                            } else {
                                hasRecordedUse.current = false;
                            }
                        } catch {
                            alert("文件读取失败，请确认文件没有损坏，且格式为 TXT 或 DOCX。");
                        } finally {
                            input.value = "";
                        }
                    }}
                    hidden
                />
             
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                支持 TXT 文本和 Word（.docx）文档
            </span>
            <textarea
                value={text}

                onChange={(event) => {
                    const value = event.target.value;
                    setText(value);

                    if (value.trim().length > 0) {
                        recordToolUse();
                    } else {
                        hasRecordedUse.current = false;
                    }
                }}

                aria-label="需要统计的文本"
                placeholder="请在这里输入或粘贴文本……"
                rows={6}
                className="w-full rounded-xl border border-zinc-300 bg-white p-4 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                当前字符数：{text.length}
                <br />
                不含空白的字符数：{text.replace(/\s/g, "").length}
                <br />
                标点符号数：{(text.match(/\p{P}/gu) ?? []).length}
            </p>
            <button
                type="button"
                onClick={() => {
                    setText("");
                    hasRecordedUse.current = false;
                }}
                disabled={text.length === 0}
                className="rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
                清空文本
            </button>
        </div>
    );
}