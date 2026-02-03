"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. LOGIN
      const response = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Identifiants incorrects");
        setLoading(false);
        return;
      }

      // Sauvegarde initiale
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setLoading(false);
      setSyncing(true);
      setSyncProgress(5);

      // 2. LANCER LA BARRE DE PROGRESSION (Fake)
      const fakeProgress = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 99) return prev;
          const step = prev < 70 ? 3 : prev < 90 ? 1.5 : 0.5;
          return Math.min(prev + step, 99);
        });
      }, 300);

      // 3. APPEL SYNC (BullMQ)
      try {
        const syncResp = await fetch("http://localhost:3001/auth/sync-status", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            "Content-Type": "application/json",
          },
        });

        // Même si le backend répond "OK" tout de suite, on attend 3 secondes
        // pour laisser le Worker BullMQ travailler avant de rediriger
        await new Promise((resolve) => setTimeout(resolve, 3000));

        clearInterval(fakeProgress);
        setSyncProgress(100);

        setTimeout(() => {
          window.location.href = "/";
        }, 500);

      } catch (err) {
        clearInterval(fakeProgress);
        setError("La synchronisation a échoué, mais vous pouvez continuer.");
        setSyncing(false);
        setTimeout(() => router.push("/"), 1500);
      }
    } catch (err) {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-4 sm:pt-12 pb-12">
      {/* Utilisation de mt-0 et sm:-mt-10 pour coller le contenu en haut */}
      <div className="w-full max-w-[320px] sm:max-w-sm transition-all mt-0 sm:-mt-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">
            Connexion
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            Entrez vos identifiants pour continuer.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1"
            >
              Adresse e-mail
            </label>
            <input
              type="email"
              id="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <label className="flex items-center group cursor-pointer text-gray-500">
              <input
                type="checkbox"
                id="remember"
                className="h-3.5 w-3.5 rounded-sm border-white/10 bg-white/5 text-pink-600 focus:ring-0 focus:ring-offset-0 transition-colors"
              />
              <span className="ml-2 group-hover:text-gray-400 transition-colors font-medium">
                Rester connecté
              </span>
            </label>
            <a
              href="#"
              className="text-pink-600/80 hover:text-pink-500 font-medium transition-colors"
            >
              Oublié ?
            </a>
          </div>

          {error && (
            <div className="p-3 text-red-400 text-center text-xs bg-red-500/5 rounded-xl border border-red-500/10 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-bold text-sm transition-all shadow-lg shadow-pink-900/10 active:scale-[0.98]"
            >
              {loading ? "Chargement..." : "Se connecter"}
            </button>

            <div className="text-center">
              <p className="text-gray-500 text-sm font-medium">
                Nouveau ici ?{" "}
                <Link
                  href="/register"
                  className="text-pink-600 hover:text-pink-500 transition-colors font-bold"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>

      {syncing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-6 font-medium">
          <div className="max-w-xs w-full text-center">
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="w-24 h-24 rounded-full border border-white/5"></div>
              <div className="absolute w-24 h-24 rounded-full border-t border-pink-600 animate-spin"></div>
              <span className="absolute text-white font-light text-2xl">
                {Math.round(syncProgress)}%
              </span>
            </div>
            <h2 className="text-white text-xl font-bold mb-2 tracking-tight">
              Synchronisation
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed font-medium">
              Récupération de vos données Autotask...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
