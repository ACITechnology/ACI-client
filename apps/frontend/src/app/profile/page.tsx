// apps/frontend/src/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { User, ShieldCheck } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setPhone(parsed.phone || "");
      setLoading(false);
    } else {
      window.location.href = "/login";
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError("L'ancien mot de passe est obligatoire");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Les nouveaux mots de passe ne correspondent pas");
        return;
      }
      if (newPassword.length < 8) {
        setError("Le nouveau mot de passe doit faire au moins 8 caractères");
        return;
      }
    }

    try {
      setSuccess("Modifications enregistrées avec succès");
      const updatedUser = { ...user, phone };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Erreur lors de la sauvegarde");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 animate-pulse text-lg">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-12">
      {/* Header */}
      <div className="mb-8 text-center lg:text-left px-2">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Mon Profil</h1>
        <p className="text-gray-400 text-xs md:text-base">Gérez vos informations et votre sécurité.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* Section 1: Informations personnelles */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-8 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-pink-500 flex-shrink-0" />
              <h2 className="text-lg md:text-xl font-semibold text-white">Informations</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">Prénom</label>
                <div className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs sm:text-sm truncate">
                  {user.firstName}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">Nom</label>
                <div className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs sm:text-sm truncate">
                  {user.lastName}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">Email</label>
              <div className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-xs sm:text-sm truncate">
                {user.email}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1 ml-1">
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-pink-500 text-white text-xs sm:text-sm placeholder:text-gray-600 placeholder:text-[11px] sm:placeholder:text-sm transition"
                placeholder="06 00 00 00 00"
              />
            </div>
          </div>

          {/* Section 2: Sécurité */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-8 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-pink-500 flex-shrink-0" />
              <h2 className="text-lg md:text-xl font-semibold text-white">Sécurité</h2>
            </div>

            <div>
              <label htmlFor="currentPassword" className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-pink-500 text-white text-xs sm:text-sm placeholder:text-gray-600 placeholder:text-[11px] sm:placeholder:text-sm transition"
                placeholder="Mot de passe actuel"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="newPassword" className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">
                  Nouveau
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-pink-500 text-white text-xs sm:text-sm placeholder:text-gray-600 placeholder:text-[11px] sm:placeholder:text-sm transition"
                  placeholder="8+ car."
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1 ml-1">
                  Confirmation
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-pink-500 text-white text-xs sm:text-sm placeholder:text-gray-600 placeholder:text-[11px] sm:placeholder:text-sm transition"
                  placeholder="Confirmer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="max-w-2xl mx-auto space-y-4 pt-4 px-2">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 text-center text-xs">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="w-full sm:w-max sm:mx-auto block px-14 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-bold transition shadow-lg shadow-pink-600/20 active:scale-95 text-sm"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}