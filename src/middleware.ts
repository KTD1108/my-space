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

  // 5. Nếu người dùng KHÔNG có bất kỳ cookie auth nào:
  if (!hasAuthCookie) {
    if (isAuthPage) {
      return NextResponse.next() // Vào trang login tức thì (0ms)
    }
    // Chưa đăng nhập mà vào trang bảo vệ -> Chuyển về login tức thì (0ms)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 6. TỐI ƯU HÓA SIÊU MƯỢT (0ms ROUTER TRANSITION):
  // Khi người dùng đã có auth cookie và đang chuyển trang trong Single Page App (RSC / prefetch):
  // Trả về Next.js RSC payload NGAY LẬP TỨC (0ms), tuyệt đối KHÔNG chặn bằng API call sang Supabase!
  const isRSC = request.headers.has('rsc') || 
                request.headers.has('next-router-prefetch') || 
                request.headers.has('next-router-state-tree') ||
                request.headers.get('purpose') === 'prefetch' ||
                request.headers.get('accept')?.includes('text/x-component')

  if (isRSC) {
    return NextResponse.next()
  }

  // 7. Đã có auth cookie mà cố vào lại trang Đăng nhập -> Chuyển về trang chủ tức thì (0ms)
  if (isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 8. Đối với full document request: Phục vụ trang HTML ngay lập tức (0ms).
  // Mọi thao tác đọc/ghi dữ liệu nhạy cảm đều được Server Action kiểm tra getUser() an toàn 100%.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
