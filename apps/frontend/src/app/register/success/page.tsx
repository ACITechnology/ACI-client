// apps/frontend/src/app/register/success/page.tsx
import Link from 'next/link';

export default function RegisterSuccess() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center -mt-[16vh] px-4 pb-20">
      <div className="text-center">
        {/* Icône check dans cercle rose */}
        <div className="mx-auto w-16 h-16 bg-pink-600/20 rounded-full flex items-center justify-center mb-5">
          <svg
            className="w-8 h-8 text-pink-500"
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

        <h1 className="text-3xl font-bold text-white mb-3">
          Inscription réussie !
        </h1>

        <p className="text-base text-gray-300 mb-8 max-w-sm">
          Votre compte ACI Technology a été créé avec succès.<br />
          Vous pouvez maintenant accéder à votre portail client.
        </p>

        <Link href="/login">
          <button className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-medium text-base transition shadow-lg">
            Se connecter
          </button>
        </Link>
      </div>
    </div>
  );
}