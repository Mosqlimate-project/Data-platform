import '../globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Chatbot from "../components/Chatbot";
import { ThemeProvider } from 'next-themes';

export const metadata = {
  title: "Mosqlimate",
  description: "",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col transition-colors">
        <ThemeProvider attribute="class" defaultTheme="light">
          <Navbar />
          <main className="flex-1 flex flex-col md:items-center">{children}</main>
          <Footer />
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
