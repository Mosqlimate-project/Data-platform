import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import ClientProviders from '@/components/ClientProviders';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import I18nProvider from '@/components/I18nProvider';
import GlobalLoading from '@/components/GlobalLoading';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Mosqlimate",
  description: "",
  icons: "/favicon.ico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors`}>
        <I18nProvider>
          <ClientProviders>
            <GlobalLoading />
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
