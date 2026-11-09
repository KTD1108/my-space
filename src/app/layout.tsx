import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Space — Không gian số cá nhân",
  description: "Nền tảng quản lý tài liệu, giai điệu, lịch trình và kỷ niệm cá nhân thông minh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${fontSans.className} bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 overflow-hidden`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
