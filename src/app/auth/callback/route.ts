import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
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

  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback] exchangeCodeForSession failed:', exchangeError.message)
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent('Liên kết xác thực đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.')}`,
            origin
          )
        )
      }

      // Đổi code thành công -> chuyển tiếp tới trang tiếp theo (mặc định: /reset-password)
      return NextResponse.redirect(new URL(next, origin))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Auth Callback] Unexpected error during code exchange:', msg)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Có lỗi xảy ra trong quá trình xác thực.')}`, origin)
      )
    }
  }

  // Không có code trong URL callback
  return NextResponse.redirect(new URL('/login', origin))
}
