"use server";
import { allowAdminLoginAttempt } from "../../../lib/admin-login-limit";
import { redirect } from "next/navigation";
import {
    verifyAdminCredentials,
    setAdminSessionCookie,
} from "../../../lib/admin-auth";

export async function loginAdmin(
    _previousState: { error: string },
    formData: FormData
): Promise<{ error: string }> {
    const username = formData.get("username");
    const password = formData.get("password");

    if (
        typeof username !== "string" ||
        typeof password !== "string"
    ) {
        return { error: "请输入用户名和密码。" };
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