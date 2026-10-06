import "server-only";
import type Database from "better-sqlite3";
import { isIP } from "node:net";

// Enable only when Nginx overwrites X-Real-IP and the backend is not public.
export function visitorTrackingEnabled(): boolean {
    return process.env.ANALYTICS_TRUST_PROXY === "true";
}

export function getVisitorIp(headers: Headers): string | null {
    if (!visitorTrackingEnabled()) return null;
    const value = headers.get("x-real-ip")?.trim();
    if (!value || value.length > 45 || value.includes("%")) return null;
    const version = isIP(value);
    if (version === 4) return value;
    if (version !== 6) return null;
    const normalized = new URL("http://[" + value + "]/").hostname.slice(1, -1);
    const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
    if (!mapped) return normalized;
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

export function initializeVisitorStats(db: Database.Database) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS visitor_ip_daily (
            day TEXT NOT NULL,
            ip TEXT NOT NULL,
            page_views INTEGER NOT NULL DEFAULT 1,
            last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (day, ip)
        )
    `);
}

export function pruneVisitorStats(db: Database.Database) {
    db.prepare("DELETE FROM visitor_ip_daily WHERE day < date('now', '+9 hours', '-29 days')").run();
}

export function recordVisitorPageView(db: Database.Database, ip: string) {
    db.prepare(`
        INSERT INTO visitor_ip_daily (day, ip)
        VALUES (date('now', '+9 hours'), ?)
        ON CONFLICT(day, ip) DO UPDATE SET
            page_views = page_views + 1,
            last_seen = CURRENT_TIMESTAMP
    `).run(ip);
}

export function readVisitorStats(db: Database.Database) {
    return db.transaction(() => {
        pruneVisitorStats(db);
        const summary = db.prepare(`
            SELECT COUNT(DISTINCT ip) AS uniqueIps,
                   COALESCE(SUM(page_views), 0) AS pageViews
            FROM visitor_ip_daily
            WHERE day >= date('now', '+9 hours', '-29 days')
              AND day <= date('now', '+9 hours')
        `).get() as { uniqueIps: number; pageViews: number };
        const rows = db.prepare(`
            SELECT ip, SUM(page_views) AS pageViews,
                   strftime('%Y-%m-%dT%H:%M:%SZ', MAX(last_seen)) AS lastSeen
            FROM visitor_ip_daily
            WHERE day >= date('now', '+9 hours', '-29 days')
              AND day <= date('now', '+9 hours')
            GROUP BY ip
            ORDER BY MAX(last_seen) DESC, ip ASC
            LIMIT 100
        `).all() as { ip: string; pageViews: number; lastSeen: string }[];
        return { ...summary, rows, enabled: visitorTrackingEnabled() };
    })();
}
