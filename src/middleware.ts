import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Bỏ qua các file tĩnh, favicon, hình ảnh, tài nguyên public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const isAuthPage = pathname.startsWith('/login')
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isResetPassword = pathname.startsWith('/reset-password')

  // 2. Auth callback và reset-password được phép truy cập ngay lập tức
  if (isAuthCallback || isResetPassword) {
    return NextResponse.next()
  }

  // 3. Next.js Server Actions: đã tự kiểm tra xác thực ở tầng Server Action, không cần middleware xác thực lại
  if (request.headers.has('next-action')) {
    return NextResponse.next()
  }

  // 4. Kiểm tra sự tồn tại của Cookie Auth Supabase
  // Cookie token Supabase SSR luôn có dạng chứa 'auth-token' hoặc 'sb-'
  const hasAuthCookie = request.cookies.getAll().some(
    cookie => cookie.name.includes('auth-token') || cookie.name.startsWith('sb-')
  )

  // Nếu người dùng KHÔNG có bất kỳ cookie auth nào:
  if (!hasAuthCookie) {
    if (isAuthPage) {
      return NextResponse.next() // Vào trang login tức thì (0ms)
    }
    // Chưa đăng nhập mà vào trang bảo vệ -> Chuyển về login tức thì (0ms)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Nếu CÓ cookie auth: Khởi tạo client Supabase để refresh session hợp lệ
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Chưa đăng nhập thực sự (cookie giả/hết hạn) mà muốn vào web -> Đẩy ra trang login
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Đã đăng nhập mà cố vào trang Đăng nhập -> Đẩy về Trang chủ
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
