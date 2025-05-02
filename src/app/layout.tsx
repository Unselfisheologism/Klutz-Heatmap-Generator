import type { Metadata } from 'next';
// Removed Geist font import as it's causing errors and likely not available via next/font/google
// import { Geist_Sans as Geist, Geist_Mono as GeistMono } from 'next/font/google';
import Script from 'next/script'; // Import Next.js Script component
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Removed Geist font instantiation
// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });
//
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'Klutz Content Heatmap', // Updated title
  description: 'Generate engagement heatmaps for images and text using Puter.js AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add the 'dark' class here to enable dark mode
    <html lang="en" className="dark">
      <head>
        {/* Add Puter.js script using Next.js Script component */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      {/* Removed Geist font variables from className */}
      <body className={`antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
