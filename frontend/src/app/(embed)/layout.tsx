import "../../globals.css";

export default function EmbedRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-transparent overflow-hidden">
        {children}
      </body>
    </html>
  );
}
