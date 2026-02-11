import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import '../globals.css';
import ClientProviders from '@/components/ClientProviders';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import I18nProvider from '@/components/I18nProvider';
import GlobalLoading from '@/components/GlobalLoading';

const inter = Inter({ subsets: ['latin'] });
const isProd = process.env.NODE_ENV === 'production';

export const metadata: Metadata = {
  title: "Mosqlimate",
  description: "",
  icons: "/favicon.ico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors`}>
        {isProd && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-S3L0RNJZ0Z"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-S3L0RNJZ0Z');
              `}
            </Script>
          </>
        )}

        <GlobalLoading />
        <I18nProvider>
          <ClientProviders>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1 md:items-center bg-bg">{children}</main>
              <Footer />
              <Chatbot />
            </div>
          </ClientProviders>
        </I18nProvider>
      </body>
    </html>
  );
}
