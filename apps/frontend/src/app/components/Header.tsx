"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Chargement de l'utilisateur
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

  // Fermeture au clic extérieur
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="relative z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8 flex items-center justify-between">
        
        {/* LOGO */}
        <div className="flex items-center">
          <Link href="/">
            <span className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-pink-500 transition-colors duration-300">
              Aci technology
            </span>
          </Link>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 md:gap-6">
          {user ? (
            <div className="relative" ref={menuContainerRef}>
              {/* Bouton Profil */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all select-none group"
              >
                <div className="w-7 h-7 rounded-full bg-pink-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <span className="hidden sm:inline-block text-sm font-medium text-white group-hover:text-pink-400 transition-colors">
                  {user.firstName} {user.lastName}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Menu Déroulant avec Animation */}
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                  <div className="px-4 py-3 border-b border-white/5 mb-1 sm:hidden">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Compte</p>
                    <p className="text-white font-medium truncate">{user.firstName} {user.lastName}</p>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-pink-500" />
                    Informations personnelles
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm border-t border-white/5 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Boutons Hors Ligne Responsive */
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login">
                <button className="px-4 sm:px-6 py-2 sm:py-2.5 text-white text-xs sm:text-sm font-medium hover:text-pink-400 transition">
                  Connexion
                </button>
              </Link>
              <Link href="/register">
                <button className="px-4 sm:px-6 py-2 sm:py-2.5 bg-pink-600 hover:bg-pink-700 rounded-full text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-pink-600/20 active:scale-95">
                  S'inscrire
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}