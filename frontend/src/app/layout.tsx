import '../globals.css';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: "Mosqlimate",
  description: "",
  icons: "/favicon.ico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen flex flex-col transition-colors">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
