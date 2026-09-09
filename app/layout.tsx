import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Navalha — Mais tempo na cadeira. Mais negócio no caixa.',
  description: 'A operação completa para barbearias modernas: agenda, fila virtual e financeiro em um só lugar.',
  generator: 'Navalha.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#17181d',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="bg-background"><body className={`${inter.variable} ${playfair.variable} antialiased`}>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
