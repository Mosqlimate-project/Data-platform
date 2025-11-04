'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Navbar />
        <main className="flex-1 flex flex-col md:items-center">{children}</main>
        <Footer />
        <Chatbot />
      </ThemeProvider>
    </I18nextProvider>
  );
}
