import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StoryCanvas - AI-Powered Children\'s Book Creator',
  description: 'Create magical, animated, 3D children\'s books with AI. Safe, beautiful, and educational.',
  keywords: ['children books', 'AI', 'education', 'storytelling', 'creative'],
  authors: [{ name: 'StoryCanvas Team' }],
  openGraph: {
    title: 'StoryCanvas - AI-Powered Children\'s Book Creator',
    description: 'Create magical children\'s books with AI',
    type: 'website',
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
