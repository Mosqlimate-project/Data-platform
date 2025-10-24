import '../globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Mosqlimate',
  description: '',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="pt-20 p-6">{children}</main>
      </body>
    </html>
  );
}
