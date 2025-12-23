import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACI Technology - Client Portal",
  description: "Manage your services, support tickets, and devices all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen relative text-white overflow-hidden`}>
  {/* Fond principal #111827 */}
  <div className="fixed inset-0 bg-[#111827]" />

    {/* 3 halos fixes avec animation pulse douce */}
  <div className="fixed inset-0 pointer-events-none">
    {/* Halo 1 : Rose – gros, bas-gauche */}
    <div className="absolute bottom-[-100px] left-[-100px] w-[700px] h-[700px] bg-[#db2777]/50 rounded-full blur-3xl halo-rose" />

    {/* Halo 2 : Bleu – moyen, haut-droite */}
    <div className="absolute top-[-100px] right-[-100px] w-[550px] h-[550px] bg-[#7ee2f7]/70 rounded-full blur-3xl halo-cyan" />

    {/* Halo 3 : Rose – petit, milieu-centre bas */}
    <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-[#db2777]/45 rounded-full blur-3xl halo-violet" />
  </div>

  {/* Header */}
  <header className="relative z-10 px-8 py-8 flex items-center justify-between max-w-7xl mx-auto w-full">
    <h1 className="text-3xl font-bold text-white">ACI TECHNOLOGY</h1>

    <div className="flex gap-4">
      <button className="px-8 py-3 rounded-full bg-gray-800/70 hover:bg-gray-700/70 text-white font-medium transition backdrop-blur-sm">
        Log In
      </button>
      <button className="px-8 py-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-medium transition">
        Sign Up
      </button>
    </div>
  </header>

  {/* Contenu principal */}
  <main className="relative z-10 flex-1 px-8">
    {children}
  </main>
</body>
    </html>
  );
}