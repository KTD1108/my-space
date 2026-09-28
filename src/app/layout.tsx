import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

// Sử dụng font Nunito siêu mềm mại và bo tròn
const nunito = Nunito({ subsets: ["vietnamese"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Góc Nhỏ Của Tôi ✨",
  description: "Không gian lưu giữ kỷ niệm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${nunito.className} bg-[#F9FAFB] overflow-hidden`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
