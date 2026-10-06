type VisitorRow = { ip: string; pageViews: number; lastSeen: string };
export type VisitorStatsData = {
    uniqueIps: number;
    pageViews: number;
    enabled: boolean;
    rows: VisitorRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
function isCount(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function parseVisitorStats(value: unknown): VisitorStatsData {
    if (!isRecord(value) || !isCount(value.uniqueIps) || !isCount(value.pageViews)
        || typeof value.enabled !== "boolean" || !Array.isArray(value.rows)) {
        throw new Error("IP 统计数据格式不正确。");
    }
    const rows = value.rows.map((row: unknown) => {
        if (!isRecord(row) || typeof row.ip !== "string" || !isCount(row.pageViews)
            || typeof row.lastSeen !== "string" || !Number.isFinite(Date.parse(row.lastSeen))) {
            throw new Error("IP 统计记录格式不正确。");
        }
        return { ip: row.ip, pageViews: row.pageViews, lastSeen: row.lastSeen };
    });
    return { uniqueIps: value.uniqueIps, pageViews: value.pageViews, enabled: value.enabled, rows };
}

export default function VisitorStats({ data }: { data: VisitorStatsData }) {
    const formatDate = (value: string) => new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).format(new Date(value));
    return (
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">访问者 IP 统计</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                最近 30 天（含今天），不同 IP {data.uniqueIps.toLocaleString()} 个，
                已记录 IP 的页面访问 {data.pageViews.toLocaleString()} 次。IP 数不代表独立访客人数。
                以下按最近访问排序，最多显示 100 个 IP。时间为 Asia/Tokyo。
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                仅统计功能启用后的页面访问，包含测试记录；历史访问无法补全 IP。
                超出 30 天的 IP 记录会在下次统计请求时清理。
            </p>
            {!data.enabled && <p role="status" className="mt-4 text-sm text-amber-700">
                IP 采集尚未启用。确认 Nginx 覆盖 X-Real-IP 且后端端口不对公网开放后，设置 ANALYTICS_TRUST_PROXY=true 并重启服务。
            </p>}
            {data.rows.length === 0 ? <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                暂无 IP 访问记录。启用后，请通过网站域名访问页面再刷新此处。
            </p> : <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-900 dark:text-zinc-100">
                    <thead><tr className="border-b border-zinc-300 dark:border-zinc-700">
                        <th scope="col" className="px-3 py-3">IP 地址</th>
                        <th scope="col" className="px-3 py-3 text-right">页面访问次数</th>
                        <th scope="col" className="px-3 py-3">最近访问时间</th>
                    </tr></thead>
                    <tbody>{data.rows.map((row) => <tr key={row.ip} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                        <td className="whitespace-nowrap px-3 py-3 font-mono">{row.ip}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.pageViews.toLocaleString()}</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatDate(row.lastSeen)}</td>
                    </tr>)}</tbody>
                </table>
            </div>}
        </section>
    );
}
