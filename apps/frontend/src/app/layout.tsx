// apps/frontend/src/app/layout.tsx


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import Header from './components/Header';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACI Technology - Portail Client",
  description: "Gérez vos services, tickets et appareils en un seul endroit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen relative text-white overflow-visible`}>
        {/* Fond principal */}
        <div className="fixed inset-0 bg-[#111827]" />

        {/* Halos */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute bottom-[-100px] left-[-100px] w-[700px] h-[700px] bg-[#db2777]/50 rounded-full blur-3xl halo-rose" />
          <div className="absolute top-[-100px] right-[-100px] w-[550px] h-[550px] bg-[#7ee2f7]/70 rounded-full blur-3xl halo-cyan" />
          <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-[#db2777]/45 rounded-full blur-3xl halo-violet" />
        </div>

        {/* Header unique */}
        <Header />

        {/* Contenu principal */}
        <main className="relative z-10 flex-1 flex flex-col items-center pt-20 px-8">
          {children}
        </main>
      </body>
    </html>
  );
}