"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { Ticket, Radio, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { lang, t, toggleLang } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto w-full px-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          {t.title}
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto">
          {t.subtitle}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6 items-stretch">
        <Link href="/tickets" className="lg:col-span-2 block">
          <div className="h-full flex flex-col bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
            <Ticket className="w-9 h-9 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition" />
            <h2 className="text-lg font-semibold text-white mb-1.5">
              {t.ticketsTitle}
            </h2>
            <p className="text-gray-400 text-xs">{t.ticketsDesc}</p>
          </div>
        </Link>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Radio className="w-9 h-9 text-white mx-auto mb-4 group-hover:scale-110 transition" />
          <h2 className="text-lg font-semibold text-white mb-1.5">
            {t.remoteTitle}
          </h2>
          <p className="text-gray-400 text-xs">{t.remoteDesc}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <ShoppingCart className="w-9 h-9 text-white mx-auto mb-4 group-hover:scale-110 transition" />
          <h2 className="text-lg font-semibold text-white mb-1.5">
            {t.shopTitle}
          </h2>
          <p className="text-gray-400 text-xs">{t.shopDesc}</p>
        </div>
      </div>

      {/* Leave a Review */}
      <div className="lg:col-span-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 flex items-center gap-4 hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Star className="w-8 h-8 text-white flex-shrink-0 group-hover:scale-110 transition" />
          <div>
            <h2 className="text-lg font-semibold text-white">
              {t.reviewTitle}
            </h2>
            <p className="text-gray-400 text-xs">{t.reviewDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}