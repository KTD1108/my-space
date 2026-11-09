'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  hasSession?: boolean;
}

function translateAuthError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau vài phút.';
  }
  if (msg.includes('for security purposes') || msg.includes('once every')) {
    return 'Vì lý do bảo mật, bạn chỉ có thể yêu cầu đặt lại mật khẩu sau mỗi 60 giây. Vui lòng đợi trong giây lát.';
  }
  if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
    return 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (msg.includes('user not found')) {
    return 'Không tìm thấy tài khoản tương ứng với địa chỉ email này.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (msg.includes('password should be at least')) {
    return `Mật khẩu phải chứa ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }
  if (msg.includes('new password should be different') || msg.includes('same_password')) {
    return 'Mật khẩu mới không được trùng với mật khẩu cũ.';
  }
  if (msg.includes('token has expired') || msg.includes('token is expired') || msg.includes('invalid token')) {
    return 'Mã xác thực đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại liên kết mới.';
  }
  if (msg.includes('session missing') || msg.includes('not logged in')) {
    return 'Phiên xác thực đã hết hạn. Vui lòng yêu cầu lại liên kết đặt lại mật khẩu.';
  }
  if (msg.includes('user already registered')) {
    return 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng nhập.';
  }
  return errorMessage || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
}

async function getAuthRedirectUrl(path: string): Promise<string> {
  const defaultOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myspacecloud.id.vn';
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    if (host) {
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `http://${host}${path}`;
      }
      const proto = headersList.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}${path}`;
    }
  } catch {}
  return `${defaultOrigin.replace(/\/$/, '')}${path}`;
}

export async function login(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim() ?? '';
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[Auth Error] signInWithPassword failed:', error.message);
    return { success: false, error: translateAuthError(error.message) };
  }

  return { success: true };
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim() ?? '';
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Mật khẩu phải chứa ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` };
  }

  const emailRedirectTo = await getAuthRedirectUrl('/auth/callback?next=/');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    }
  });

  if (error) {
    console.error('[Auth Error] signUp failed:', error.message);
    return { success: false, error: translateAuthError(error.message) };
  }

  const hasSession = !!data?.session;

  return { 
    success: true,
    hasSession,
    message: hasSession
      ? 'Đăng ký thành công! Đang chuyển hướng vào hệ thống...'
      : 'Đăng ký thành công! Liên kết kích hoạt đã được gửi vào email của bạn.' 
  };
}

export async function resetPassword(email: string): Promise<AuthActionResult> {
  const trimmedEmail = email?.trim() ?? '';
  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    return {
      success: false,
      error: 'Vui lòng nhập địa chỉ email hợp lệ.',
    };
  }

  try {
    const redirectTo = await getAuthRedirectUrl('/auth/callback?next=/reset-password');

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    });

    if (error) {
      console.error('[Auth Error] resetPassword failed for email:', trimmedEmail, error.message);
      return {
        success: false,
        error: translateAuthError(error.message),
      };
    }

    return {
      success: true,
      message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam).',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Auth System Error] resetPassword encountered unexpected error:', errorMsg);
    return {
      success: false,
      error: 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
    };
  }
}

export async function updateUserPassword(newPassword: string): Promise<AuthActionResult> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('[Auth Error] updateUserPassword failed:', error.message);
      return {
        success: false,
        error: translateAuthError(error.message),
      };
    }

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể tiếp tục sử dụng hệ thống.',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Auth System Error] updateUserPassword encountered unexpected error:', errorMsg);
    return {
      success: false,
      error: 'Không thể cập nhật mật khẩu. Vui lòng thử lại sau.',
    };
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
