"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [isSelectedFromList, setIsSelectedFromList] = useState(false);

  useEffect(() => {
    const searchInput = document.getElementById("companySearch") as HTMLInputElement;
    const resultsDiv = document.getElementById("companyResults");

    if (!searchInput || !resultsDiv) return;

    const searchCompanies = async (query: string) => {
      if (query.length < 2) {
        resultsDiv.classList.add("hidden");
        resultsDiv.innerHTML = "";
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:3001/company/search?q=${encodeURIComponent(query)}`
        );
        const companies = await response.json();

        if (companies.length === 0) {
          resultsDiv.innerHTML =
            '<div class="p-2.5 text-gray-400 text-center text-sm">Aucune entreprise trouvée</div>';
        } else {
          resultsDiv.innerHTML = companies
            .map(
              (company: { id: number; name: string }) =>
                `<div class="p-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 text-sm text-white font-medium" data-company-id="${company.id}">
                  ${company.name}
                </div>`
            )
            .join("");
        }
        resultsDiv.classList.remove("hidden");
      } catch (err) {
        console.error("Erreur recherche entreprise", err);
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      searchCompanies(target.value.trim());
    };

    const handleResultClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const companyDiv = target.closest("[data-company-id]");
      if (companyDiv) {
        const id = companyDiv.getAttribute("data-company-id");
        const name = companyDiv.textContent?.trim();
        if (id && name) {
          setCompanyName(name);
          setCompanyId(id);
          setIsSelectedFromList(true);
          resultsDiv.classList.add("hidden");
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!searchInput.contains(e.target as Node) && !resultsDiv.contains(e.target as Node)) {
        resultsDiv.classList.add("hidden");
      }
    };

    searchInput.addEventListener("input", handleInput);
    resultsDiv.addEventListener("click", handleResultClick);
    document.addEventListener("click", handleClickOutside);

    return () => {
      searchInput.removeEventListener("input", handleInput);
      resultsDiv.removeEventListener("click", handleResultClick);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Mot de passe : 8 caractères min, 1 majuscule, 1 chiffre, 1 spécial (@$!%*?&)");
      return;
    }
    if (!companyId || !isSelectedFromList) {
      setError("Veuillez sélectionner une entreprise dans la liste proposée");
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          companyId: Number(companyId),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Erreur lors de l’inscription');
        return;
      }
      router.push('/register/success');
    } catch (err) {
      setError('Erreur réseau — vérifiez que le backend est lancé');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-2 pb-12 transition-all">
      <div className="w-full max-w-md -mt-2">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">Inscription</h1>
          <p className="text-gray-500 text-sm font-medium">Créez votre compte ACI Technology.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Prénom</label>
              <input
                type="text"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Nom</label>
              <input
                type="text"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Email</label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Entreprise</label>
            <div className="relative">
              <input
                type="text"
                id="companySearch"
                placeholder="Nom de l'entreprise..."
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setCompanyId(null);
                  setIsSelectedFromList(false);
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
                autoComplete="off"
                required
              />
              <input type="hidden" name="companyId" value={companyId || ""} required />
              <div
                id="companyResults"
                className="absolute z-30 mt-2 w-full max-h-48 overflow-y-auto bg-[#111] border border-white/10 rounded-2xl hidden shadow-2xl backdrop-blur-xl"
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Confirmation</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-pink-600 text-white text-sm placeholder:text-gray-700 transition-all font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 text-center text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4 pt-1">
            <button
              type="submit"
              className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl text-white font-bold text-sm transition-all shadow-lg shadow-pink-900/10 active:scale-[0.98]"
            >
              S'inscrire
            </button>

            <div className="text-center">
              <p className="text-gray-500 text-sm font-medium">
                Déjà inscrit ?{" "}
                <Link 
                  href="/login" 
                  className="text-pink-600 hover:text-pink-500 transition-colors font-bold"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}