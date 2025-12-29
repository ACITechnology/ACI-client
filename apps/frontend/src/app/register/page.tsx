// apps/frontend/src/app/register/page.tsx
"use client";
import "client-only";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  // États du formulaire
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
    const searchInput = document.getElementById(
      "companySearch"
    ) as HTMLInputElement;
    const resultsDiv = document.getElementById("companyResults");

    if (!searchInput || !resultsDiv) return;

    let isSelectedFromList = false;

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
            '<div class="p-3 text-gray-400 text-center">Aucune entreprise trouvée</div>';
        } else {
          resultsDiv.innerHTML = companies
            .map(
              (company: { id: number; name: string }) =>
                `<div class="p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700 last:border-0" data-company-id="${company.id}">
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
        const name = target.textContent?.trim();
        if (id && name) {
          setCompanyName(name);
          setCompanyId(id);
          setIsSelectedFromList(true);
          resultsDiv.classList.add("hidden");
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        !searchInput.contains(e.target as Node) &&
        !resultsDiv.contains(e.target as Node)
      ) {
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

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Mot de passe : 8 caractères min, 1 majuscule, 1 chiffre, 1 spécial (@$!%*?&)"
      );
      return;
    }

    if (!companyId || !isSelectedFromList) {
      setError("Veuillez sélectionner une entreprise dans la liste proposée");
      return;
    }

    // ENVOI AU BACKEND
    try {
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          companyId: Number(companyId), // important : number, pas string
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Erreur lors de l’inscription');
        return;
      }

      // Succès : on vide le formulaire
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setCompanyName('');
      setCompanyId(null);
      setIsSelectedFromList(false);

      // Redirection automatique vers la page connexion
      router.push('/register/success');
    } catch (err) {
      setError('Erreur réseau — vérifiez que le backend est lancé');
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Inscription
          </h1>
          <p className="text-gray-400">
            Inscrivez-vous pour accéder au portail client.
          </p>
        </div>

        <form className="space-y-6 text-left" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Prénom
            </label>
            <input
              type="text"
              id="firstName"
              placeholder="Votre prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Nom
            </label>
            <input
              type="text"
              id="lastName"
              placeholder="Votre nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

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
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
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
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="companySearch"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Entreprise
            </label>
            <div className="relative">
              <input
                type="text"
                id="companySearch"
                placeholder="Tapez le nom de votre entreprise..."
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setCompanyId(null);
                  setIsSelectedFromList(false);
                }}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
                autoComplete="off"
                required
              />
              <input
                type="hidden"
                id="selectedCompanyId"
                name="companyId"
                value={companyId || ""}
                required
              />
              <div
                id="companyResults"
                className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800/90 border border-gray-700 rounded-lg hidden"
              >
                {/* Résultats injectés par le useEffect */}
              </div>
            </div>
          </div>
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white font-medium transition shadow-md"
          >
            S'inscrire
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-pink-600 hover:text-pink-500">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
