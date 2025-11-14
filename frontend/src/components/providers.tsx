'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { Toaster } from './ui/toaster'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
