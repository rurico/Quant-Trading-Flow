import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { I18nProvider } from '@/context/i18n-provider';
import { ThemeProvider } from '@/context/theme-provider';
export const metadata: Metadata = {
  title: '量化交易工作流 (Quant Trading Flow)',
  description: '量化交易工作流 (Quant Trading Flow)',
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(GeistSans.variable, /* GeistMono.variable, */ 'antialiased font-sans')}>
        <ThemeProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
