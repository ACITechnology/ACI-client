// apps/frontend/src/components/CompanyAutocomplete.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface Company {
  id: number;
  name: string;
}

interface CompanyAutocompleteProps {
  onSelect: (company: Company | null) => void;
}

export default function CompanyAutocomplete({ onSelect }: CompanyAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setCompanies([]);
      setIsOpen(false);
      return;
    }

    const fetchCompanies = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/company/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setCompanies(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Erreur recherche entreprise', err);
        setCompanies([]);
      }
    };

    const debounce = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (company: Company) => {
    setQuery(company.name);
    setIsOpen(false);
    onSelect(company);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      inputRef.current && !inputRef.current.contains(e.target as Node) &&
      resultsRef.current && !resultsRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tapez le nom de votre entreprise..."
        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent text-white placeholder-gray-500"
        autoComplete="off"
        required
      />
      {isOpen && (
        <div
          ref={resultsRef}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800/90 border border-gray-700 rounded-lg"
        >
          {companies.length === 0 ? (
            <div className="p-3 text-gray-400 text-center">Aucune entreprise trouvée</div>
          ) : (
            companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleSelect(company)}
                className="p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700 last:border-0"
              >
                {company.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}