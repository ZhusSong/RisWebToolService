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
                  </div>
              </div>
          </body>
    </html>
  );
}
