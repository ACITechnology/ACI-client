// apps/frontend/src/app/register/success/page.tsx
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function RegisterSuccess() {
  return (
    // Augmentation du padding bottom (pb-24) pour donner de l'air
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-10 pb-24">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
        
        {/* Cercle d'animation Succès */}
        <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Check className="w-8 h-8 text-green-400" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Inscription réussie !
        </h1>

        <div className="space-y-4 mb-10">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Votre compte <span className="text-white font-semibold">ACI Technology</span> a été créé avec succès.
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            Vous pouvez désormais vous connecter pour accéder à votre portail client et gérer vos services.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full sm:px-10 py-3.5 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-bold text-sm transition shadow-lg shadow-pink-600/20 active:scale-95">
              Se connecter
            </button>
          </Link>
        </div>
      </div>

    </div>
  );
}