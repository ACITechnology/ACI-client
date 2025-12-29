"use client";

import { useLanguage } from '@/hooks/useLanguage';
import { Ticket, Radio, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { lang, t, toggleLang } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
        <p className="text-base text-gray-400 max-w-2xl mx-auto">{t.subtitle}</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-8">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Ticket className="w-12 h-12 text-pink-500 mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">{t.ticketsTitle}</h2>
          <p className="text-gray-400 text-sm">{t.ticketsDesc}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Radio className="w-12 h-12 text-white mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">{t.remoteTitle}</h2>
          <p className="text-gray-400 text-sm">{t.remoteDesc}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <ShoppingCart className="w-12 h-12 text-white mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">{t.shopTitle}</h2>
          <p className="text-gray-400 text-sm">{t.shopDesc}</p>
        </div>
      </div>

      {/* Leave a Review */}
      <div className="lg:col-span-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 flex items-center gap-6 hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Star className="w-10 h-10 text-white flex-shrink-0 group-hover:scale-110 transition" />
          <div>
            <h2 className="text-xl font-semibold text-white">{t.reviewTitle}</h2>
            <p className="text-gray-400 text-sm">{t.reviewDesc}</p>
          </div>
        </div>
      </div>

    </div>
  );
}