// apps/frontend/src/app/login/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Email ou mot de passe incorrect');
        setLoading(false);
        return;
      }

      // Succès
      setError('');
      setLoading(false);
      // Plus tard : stocker token + redirection
            // Stockage du token et de l'utilisateur
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirection vers l'accueil
      router.push('/');
    } catch (err) {
      setError('Erreur réseau — vérifiez que le backend tourne');
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Connexion</h1>
          <p className="text-gray-400">
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <form className="space-y-6 text-left" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1 text-left"
            >
              Adresse e-mail
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-4 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-1 text-left"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-gray-600 text-pink-600 focus:ring-pink-600 bg-gray-700"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-300">
                Se souvenir de moi
              </label>
            </div>
            <a href="#" className="text-sm text-pink-600 hover:text-pink-500">
              Mot de passe oublié ?
            </a>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition shadow-md"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
