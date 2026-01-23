"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Chargement de l'utilisateur depuis localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, [pathname]);

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Fonction de déconnexion
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="relative z-50 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link href="/">
          <span className="text-2xl font-bold text-white cursor-pointer hover:opacity-80 transition">
            Aci technology
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <div className="relative" ref={menuContainerRef}>
            {/* Bouton principal qui ouvre/ferme le menu */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 text-base font-medium text-white hover:text-pink-500 transition select-none"
            >
              <span>{user.firstName} {user.lastName}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menu déroulant */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#121212] border border-gray-800 rounded-xl shadow-2xl py-1.5 overflow-hidden z-50">
                {/* Informations personnelles */}
                <Link
                  href="/profile"
                  className="block w-full px-5 py-4 hover:bg-gray-700/60 transition text-left text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="text-white font-medium">Informations personnelles</span>
                </Link>

                {/* Déconnexion */}
                <button
                  onClick={handleLogout}
                  className="block w-full px-5 py-4 hover:bg-gray-700/60 transition text-left text-sm text-red-400 hover:text-red-300"
                >
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <Link href="/login">
              <button className="px-6 py-2.5 border border-gray-500 rounded-full hover:bg-gray-800 transition text-white text-sm">
                Se connecter
              </button>
            </Link>
            <Link href="/register">
              <button className="px-6 py-2.5 bg-[#db2777] rounded-full hover:bg-[#c41f68] transition shadow-lg text-white text-sm">
                S'inscrire
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}