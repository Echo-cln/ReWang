import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "回望 · 看见数据，也看见决定",
  description: "以可追溯的数据记录投资决策，比较历史路径，回望每一次判断。",
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
