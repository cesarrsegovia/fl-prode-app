import type { Metadata } from 'next';
import './globals.css';
import { Space_Grotesk, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prode - Pronósticos Deportivos',
  description: 'Predecí resultados de fútbol y competí con tus amigos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("dark", spaceGrotesk.variable, inter.variable)}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <RealtimeProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
