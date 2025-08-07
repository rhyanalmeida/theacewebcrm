import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/auth/auth-provider'
import { BRAND_CONFIG } from '@/lib/utils'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} - Client Portal`,
  description: 'Access your projects, files, and communications',
  icons: {
    icon: BRAND_CONFIG.logo,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'bg-background text-foreground border border-border',
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}