// apps/frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      // 1. Authentification
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

      // Stockage initial
      console.log("1. Réponse Login reçue:", data);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      console.log("2. LocalStorage après Login:", {
        token: localStorage.getItem("token"),
        user: localStorage.getItem("user")
      });

      // 2. Déclenchement de la Synchronisation
      setLoading(false);
      setSyncing(true);
      setSyncProgress(5);

      // Simulation de progression fluide et progressive
      const fakeProgress = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 99) return prev;
          const step = prev < 70 ? 3 : (prev < 90 ? 1.5 : 0.5);
          return Math.min(prev + step, 99);
        });
      }, 300);

      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const syncResp = await fetch("http://localhost:3001/auth/sync-status", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${data.access_token}`,
            "Content-Type": "application/json" 
          }
        });

        clearInterval(fakeProgress);

        if (syncResp.ok) {
          setSyncProgress(100);
          const updatedData = await syncResp.json();
          
          console.log("3. Données de synchro reçues:", updatedData);

          if (updatedData.user) {
            localStorage.setItem("user", JSON.stringify(updatedData.user));
            console.log("4. LocalStorage mis à jour avec User synchro:", localStorage.getItem("user"));
          }

          setTimeout(() => {
            console.log("5. Tentative de redirection vers /");
            window.location.href = "/"; 
          }, 400);
        } else {
          throw new Error("Erreur synchro");
        }
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
    <div className="min-h-screen flex flex-col items-center justify-center -mt-[23vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-3">Connexion</h1>
          <p className="text-gray-400 text-sm">
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <form className="space-y-5 text-left" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Adresse e-mail
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500 text-sm"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500 text-sm"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-3.5 w-3.5 rounded border-gray-600 text-pink-600 focus:ring-pink-600 bg-gray-700"
              />
              <label htmlFor="remember" className="ml-2 text-gray-300">
                Se souvenir de moi
              </label>
            </div>
            <a href="#" className="text-pink-600 hover:text-pink-500">
              Mot de passe oublié ?
            </a>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-center text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition shadow-md text-sm"
          >
            Se connecter
          </button>
        </form>
      </div>

      {syncing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            {/* Icône animée */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-pink-600/20 border-t-pink-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-pink-500 font-bold text-xs">
                  {Math.round(syncProgress)}%
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white text-center mb-1.5">
              {syncProgress < 100 ? "Synchronisation..." : "C'est prêt !"}
            </h2>
            
            <p className="text-gray-400 text-center text-xs mb-6">
              {syncProgress < 100 
                ? "Nous récupérons vos derniers tickets et messages depuis Autotask." 
                : "Vos données sont à jour. Redirection en cours..."}
            </p>

            {/* Barre de progression */}
            <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-pink-600 to-pink-400 h-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(219,39,119,0.5)]"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}