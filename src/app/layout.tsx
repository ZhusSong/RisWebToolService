import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import messages from "../messages/zh-CN";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    title: messages.site.name,
    description: messages.site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
          <body className="min-h-screen bg-white">
              <div className="flex min-h-screen flex-col md:flex-row">
                  <Sidebar />

                  <div className="flex min-w-0 flex-1 flex-col">
                      {children}
                      {process.env.ANALYTICS_TRUST_PROXY === "true" && (
                          <footer className="px-6 py-4 text-center text-xs text-zinc-500">
                              本站为运行统计记录访问 IP、访问次数及时间，仅供管理员查看，保留最近 30 天；过期数据在下次统计请求时清理。
                          </footer>
                      )}
                  </div>
              </div>
          </body>
    </html>
  );
}
