import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster, ToastProvider } from '@/components/ui/toast'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Navalha — Mais tempo na cadeira. Mais negócio no caixa.',
  description: 'A operação completa para barbearias modernas: agenda, fila virtual e financeiro em um só lugar.',
  generator: 'Navalha.app',
}

export const viewport: Viewport = {
  // 'dark light': deixa o browser adaptar a UI nativa (scrollbar, controles) ao
  // color-scheme que o CSS realmente aplica por tema, em vez de travar em 'dark'.
  colorScheme: 'dark light',
  themeColor: '#17181d',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {/* Roda antes da hidratação: aplica o tema salvo (localStorage) sem flash. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
