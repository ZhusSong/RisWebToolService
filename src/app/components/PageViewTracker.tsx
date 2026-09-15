"use client";

import { useEffect } from "react";

export default function PageViewTracker({
    pageName,
}: {
    pageName: string;
}) {
    useEffect(() => {
        void fetch("/api/analytics", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventType: "page_view",
                toolName: pageName,
            }),
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`统计请求失败：${response.status}`);
            }
        })
            .catch((error) => {
                console.warn("本次页面访问统计未确认成功：", error);
            });
    }, [pageName]);

    return null;
}