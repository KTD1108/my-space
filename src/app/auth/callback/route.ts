import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/reset-password'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin

  if (error) {
    console.error(`[Auth Callback] Error from Supabase: ${error} - ${errorDescription}`)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || 'Xác thực thất bại.')}`, origin)
    )
  }

  // Chuẩn bị URL chuyển hướng kế tiếp
  const redirectTarget = new URL(next, origin)
  const response = NextResponse.redirect(redirectTarget)

  // Gắn trực tiếp cookies vào response để đảm bảo cookie phiên được gửi về trình duyệt
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 1. Xử lý PKCE flow (code)
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!exchangeError) {
        return response
      }
      console.error('[Auth Callback] exchangeCodeForSession failed:', exchangeError.message)
    } catch (err) {
      console.error('[Auth Callback] exchangeCodeForSession exception:', err)
    }
  }

  // 2. Xử lý OTP / token_hash flow
  if (token_hash && type) {
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      })
      if (!verifyError) {
        return response
      }
      console.error('[Auth Callback] verifyOtp failed:', verifyError.message)
    } catch (err) {
      console.error('[Auth Callback] verifyOtp exception:', err)
    }
  }

  // Nếu không có code/token_hash hoặc đổi session thất bại
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent('Liên kết xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.')}`,
      origin
    )
  )
}
