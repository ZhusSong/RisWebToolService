//import Image from "next/image";
//import TextCounter from "./components/TextCounter";
import Link from "next/link";
import PageViewTracker from "./components/PageViewTracker";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {/*<main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">*/}
              <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-10 px-8 py-20 bg-white dark:bg-black sm:items-start">
              {/*<Image*/}
     
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
                  <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                      个人工具站
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
         
            常用的工具网站集合体
          </p>
        </div>
              <Link
                  href="/page_textcounter"
                  className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      文本字数统计
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      实时统计字符数，支持排除空白字符。
                  </p>
                  <span className="mt-4 inline-block text-sm font-medium text-blue-600 dark:text-blue-400">
                      打开工具 →
                  </span>
              </Link>
          </main>
          <PageViewTracker pageName="首页" />
    </div>
  );
}
