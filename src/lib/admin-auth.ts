import { SignJWT, jwtVerify } from "jose";
import "server-only";
import { pbkdf2, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const pbkdf2Async = promisify(pbkdf2);
export async function verifyAdminPassword(
    password: string
): Promise<boolean> {
    if (!password || password.length > 1024) {
        return false;
    }

    const configuredHash = process.env.ADMIN_PASSWORD_HASH;
    if (!configuredHash) {
        throw new Error("未配置管理员密码哈希");
    }

    const parts = configuredHash.split(":");
    if (
        parts.length !== 4 ||
        parts[0] !== "pbkdf2_sha256" ||
        parts[1] !== "600000"
    ) {
        throw new Error("管理员密码哈希格式不正确");
    }

    const salt = Buffer.from(parts[2], "base64");
    const expectedHash = Buffer.from(parts[3], "base64");

    if (salt.length !== 16 || expectedHash.length !== 32) {
        throw new Error("管理员密码哈希长度不正确");
    }

    const actualHash = await pbkdf2Async(
        password, salt, 600000, 32, "sha256"
    );

    return timingSafeEqual(actualHash, expectedHash);
}
function getAdminSessionKey(): Uint8Array {
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
        throw new Error("管理员会话密钥必须是 64 位十六进制字符串");
    }

    return Buffer.from(secret, "hex");
}
export async function createAdminSession(): Promise<string> {
    return new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("admin")
        .setIssuer("ristoolservice")
        .setAudience("ristoolservice-admin")
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(getAdminSessionKey());
}
export async function verifyAdminSession(
    token: string
): Promise<boolean> {
    const key = getAdminSessionKey();

    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ["HS256"],
            issuer: "ristoolservice",
            audience: "ristoolservice-admin",
            requiredClaims: ["exp", "iat", "sub"],
            maxTokenAge: "2h",
        });

        return payload.sub === "admin" && payload.role === "admin";
    } catch {
        return false;
    }
}
export async function isAdminAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token) {
        return false;
    }

    return verifyAdminSession(token);
}
export async function verifyAdminCredentials(
    username: string,
    password: string
): Promise<boolean> {
    const expectedUsername = process.env.ADMIN_USERNAME;

    if (!expectedUsername) {
        throw new Error("未配置管理员用户名");
    }

    if (!username || username.length > 64) {
        return false;
    }

    const passwordMatches = await verifyAdminPassword(password);

    return username === expectedUsername && passwordMatches;
}
export async function setAdminSessionCookie(): Promise<void> {
    const token = await createAdminSession();
    const cookieStore = await cookies();

    cookieStore.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 2 * 60 * 60,
    });
}