import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CivicPakistan - Civic Accountability Platform',
  description: 'AI-assisted civic issue resolution, public transparency, and government accountability platform for Pakistan',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={${inter.className} bg-white text-gray-900}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
