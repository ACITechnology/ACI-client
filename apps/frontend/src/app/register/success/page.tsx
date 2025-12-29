// apps/frontend/src/app/register/success/page.tsx
import Link from 'next/link';

export default function RegisterSuccess() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8">
      <div className="text-center">
        {/* Icône check dans cercle rose */}
        <div className="mx-auto w-20 h-20 bg-pink-600/20 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-pink-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">
          Inscription réussie !
        </h1>

        <p className="text-lg text-gray-300 mb-8 max-w-md">
          Votre compte ACI Technology a été créé avec succès.<br />
          Vous pouvez maintenant accéder à votre portail client.
        </p>

        <Link href="/login">
          <button className="px-8 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-medium text-lg transition shadow-lg">
            Se connecter
          </button>
        </Link>

      </div>
    </div>
  );
}