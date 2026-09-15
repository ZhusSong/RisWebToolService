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
        });
    }, [pageName]);

    return null;
}