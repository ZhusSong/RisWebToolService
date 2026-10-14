"use server";
import { allowAdminLoginAttempt } from "../../../lib/admin-login-limit";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requestRetryAfter } from "../../../lib/request-guard";
import {
    verifyAdminCredentials,
    setAdminSessionCookie,
} from "../../../lib/admin-auth";

export async function loginAdmin(
    _previousState: { error: string },
    formData: FormData
): Promise<{ error: string }> {
    if (requestRetryAfter("login", new Headers(await headers()))) {
        return { error: "请求过于频繁，请一分钟后重试。" };
    }
    let bytes = 0;
    for (const [key, value] of formData) {
        if (typeof value !== "string") return { error: "登录请求过大或包含不支持的内容。" };
        bytes += Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
        if (bytes > 8192) return { error: "登录请求过大或包含不支持的内容。" };
    }
    const username = formData.get("username");
    const password = formData.get("password");

    if (
        typeof username !== "string" ||
        typeof password !== "string"
    ) {
        return { error: "请输入用户名和密码。" };
    }
    if (username.length > 64 || password.length > 1024 || formData.getAll("username").length !== 1 || formData.getAll("password").length !== 1) {
        return { error: "登录请求过大或包含不支持的内容。" };
    }

    try {
        if (!allowAdminLoginAttempt()) {
            return { error: "登录尝试次数过多，请在当前 15 分钟窗口结束后重试。" };
        }

        const valid = await verifyAdminCredentials(username, password);
        if (!valid) {
            return { error: "用户名或密码错误。" };
        }

        await setAdminSessionCookie();
    } catch (error) {
        console.error(
            "管理员登录处理异常：",
            error instanceof Error ? error.message : "未知错误"
        );

        return { error: "暂时无法登录，请稍后重试。" };
    }

    redirect("/page_admin");
}
