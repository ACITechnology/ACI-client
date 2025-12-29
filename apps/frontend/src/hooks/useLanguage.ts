// apps/frontend/src/hooks/useLanguage.ts

"use client";

import { useState } from 'react';

type Language = 'fr' | 'en';

const translations = {
  fr: {
    title: 'Portail Client',
    subtitle: 'Bienvenue. Gérez vos services et vos tickets de support en un seul endroit.',
    ticketsTitle: 'Vos Tickets',
    ticketsDesc: 'Gérer et créer des demandes de support',
    remoteTitle: 'Contrôle à distance',
    remoteDesc: 'Télécharger les outils de support',
    shopTitle: 'Boutique',
    shopDesc: 'Découvrir nos produits',
    reviewTitle: 'Laisser un avis',
    reviewDesc: 'Partagez votre expérience sur Google',
    status: 'Statut système : Tous les systèmes sont actuellement opérationnels.',
    login: 'Se connecter',
    signup: 'S\'inscrire',
  },
  en: {
    title: 'Client Portal',
    subtitle: 'Welcome back. Manage your services, support tickets, and devices all in one place.',
    ticketsTitle: 'Your Tickets',
    ticketsDesc: 'Manage and create support requests',
    remoteTitle: 'Remote Control',
    remoteDesc: 'Download support tools',
    shopTitle: 'Shop',
    shopDesc: 'Explore our products',
    reviewTitle: 'Leave a Review',
    reviewDesc: 'Share your experience on Google',
    status: 'System Status: All systems are currently operational.',
    login: 'Log In',
    signup: 'Sign Up',
  },
};

export function useLanguage() {
  const [lang, setLang] = useState<Language>('fr');

  const t = translations[lang];

  const toggleLang = () => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  };

  return { lang, t, toggleLang };
}