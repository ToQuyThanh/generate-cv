import type { Metadata } from 'next'
import { Inter, Roboto_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Roboto_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'GenerateCV — Tạo CV chuyên nghiệp', template: '%s | GenerateCV' },
  description: 'Tạo CV xin việc đẹp, chuyên nghiệp chỉ trong vài phút. Hỗ trợ AI gợi ý nội dung theo JD.',
  keywords: ['tạo CV', 'mẫu CV', 'CV xin việc', 'CV tiếng Việt', 'CV miễn phí'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
