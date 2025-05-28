import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { DashboardProvider } from '../contexts/DashboardContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IntelliFin - Financial Management for Zambian SMEs',
  description: 'Comprehensive financial management and compliance platform for Zambian Small and Medium Enterprises',
  keywords: 'financial management, Zambia, SME, mobile money, ZRA compliance, invoicing, expenses',
  authors: [{ name: 'PoshyTrends Digital Solutions' }],
  creator: 'PoshyTrends Digital Solutions',
  publisher: 'PoshyTrends Digital Solutions',
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1E40AF',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZM',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'IntelliFin - Financial Management for Zambian SMEs',
    description: 'Comprehensive financial management and compliance platform for Zambian Small and Medium Enterprises',
    siteName: 'IntelliFin',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IntelliFin - Financial Management for Zambian SMEs',
    description: 'Comprehensive financial management and compliance platform for Zambian Small and Medium Enterprises',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <DashboardProvider>
            <div id="root">
              {children}
            </div>
          </DashboardProvider>
          <Toaster
            position="top-right"
            containerStyle={{
              top: 20,
              right: 20,
            }}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
              className: 'toast-notification',
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
