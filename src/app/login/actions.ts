"use server"
import { cookies } from "next/headers"

export async function verifyPin(pin: string) {
  // Lấy mã PIN bí mật từ biến môi trường (không lộ ra trình duyệt)
  const validPin = process.env.SITE_PIN;
  
  if (validPin && pin === validPin) {
    const cookieStore = await cookies();
    cookieStore.set('site_auth', 'authenticated', { 
      maxAge: 2592000, 
      path: '/',
      httpOnly: true, // Bảo mật chống XSS
      secure: process.env.NODE_ENV === 'production'
    });
    return { success: true };
  }
  
  return { success: false };
}
