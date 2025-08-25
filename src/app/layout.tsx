import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crypto Router DCA",
  description: "Cryptocurrency exchange routing and DCA strategy backtesting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Crypto Router DCA</h1>
            <div className="flex space-x-6">
              <a href="/" className="text-white hover:text-gray-200 transition-colors font-medium">
                Dashboard
              </a>
              <a href="/spreads" className="text-white hover:text-gray-200 transition-colors font-medium">
                Spreads
              </a>
              <a href="/backtest/dca" className="text-white hover:text-gray-200 transition-colors font-medium">
                DCA Backtest
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
