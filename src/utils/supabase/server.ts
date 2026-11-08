import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Next.js Server Component ném ngoại lệ nếu cookieStore.set được gọi ngoài Server Action / Route Handler
            if (process.env.NODE_ENV === 'development') {
              console.debug(`[Supabase SSR] Cookie set ignored in Server Component context for ${name}:`, (error as Error).message);
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.debug(`[Supabase SSR] Cookie remove ignored in Server Component context for ${name}:`, (error as Error).message);
            }
          }
        },
      },
    }
  )
}
