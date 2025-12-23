'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';


export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 md:items-center bg-bg">{children}</main>
            <Footer />
            <Chatbot />
          </div>
          <Toaster position="bottom-left" />
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
