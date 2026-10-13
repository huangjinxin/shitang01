import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getDataMode } from "@/lib/repository";

export const metadata: Metadata = {
  title: "后厨登记与食谱营养系统",
  description: "面向幼儿园与中小学食堂的后厨日常登记、食谱管理、营养估算与采购汇总工具",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = await getDataMode();
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-muted/30 antialiased">
        <AppShell mode={mode}>{children}</AppShell>
      </body>
    </html>
  );
}
