import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Lấy cookie xác thực
  const authCookie = request.cookies.get('site_auth')
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Nếu có cookie 'authenticated' thì được coi là đã đăng nhập
  const isAuthenticated = authCookie?.value === 'authenticated'

  // Chưa đăng nhập mà muốn vào các trang bên trong -> Đẩy ra trang login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Đã đăng nhập mà lại vào trang login -> Đẩy vào trang chủ
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Chỉ áp dụng middleware này cho các trang giao diện, bỏ qua API và file hệ thống
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
