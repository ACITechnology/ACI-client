// apps/frontend/src/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";

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

    // Validation mot de passe si rempli
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

    // Envoi au backend (on le fera plus tard)
    try {
      // À compléter : fetch POST /auth/update-profile
      setSuccess("Modifications enregistrées avec succès");
      // Mise à jour localStorage
      const updatedUser = { ...user, phone };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      setError("Erreur lors de la sauvegarde");
    }
  };

  if (loading) {
    return <div className="text-center pt-16 text-gray-400">Chargement...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-3">
            Informations personnelles
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Prénom
            </label>
            <div className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm">
              {user.firstName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Nom
            </label>
            <div className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm">
              {user.lastName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Email
            </label>
            <div className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm">
              {user.email}
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-300 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              placeholder="Votre téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 text-white placeholder-gray-400 text-sm"
            />
          </div>

          <div className="pt-5 border-t border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3">
              Changer le mot de passe
            </h2>

            <div>
              <label htmlFor="currentPassword" className="block text-xs font-medium text-gray-300 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                id="currentPassword"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 text-white placeholder-gray-400 text-sm"
              />
            </div>

            <div className="mt-3">
              <label htmlFor="newPassword" className="block text-xs font-medium text-gray-300 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="newPassword"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 text-white placeholder-gray-400 text-sm"
              />
            </div>

            <div className="mt-3">
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 text-white placeholder-gray-400 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-center text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-center text-sm">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white font-medium transition shadow-md text-sm"
          >
            Enregistrer les modifications
          </button>
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
}