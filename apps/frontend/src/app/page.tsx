"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { Ticket, Radio, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 md:py-9 -mt-[2vh] md:-mt-[5vh]">
      {/* Hero Section */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 px-2">
          {t.title}
        </h1>
        <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto px-4">
          {t.subtitle}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 items-stretch">
        
        {/* Card Tickets */}
        <Link href="/tickets" className="md:col-span-2 block group">
          <div className="h-full flex flex-col bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 md:p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition-all duration-300">
            <Ticket className="w-9 h-9 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-lg md:text-xl font-semibold text-white mb-1.5">
              {t.ticketsTitle}
            </h2>
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              {t.ticketsDesc}
            </p>
          </div>
        </Link>

        {/* Card Remote */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center hover:border-pink-500/50 hover:bg-white/8 transition-all group cursor-pointer">
          <Radio className="w-9 h-9 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-white mb-1.5">
            {t.remoteTitle}
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed">
            {t.remoteDesc}
          </p>
        </div>

        {/* Card Shop */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center hover:border-pink-500/50 hover:bg-white/8 transition-all group cursor-pointer">
          <ShoppingCart className="w-9 h-9 text-white mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-white mb-1.5">
            {t.shopTitle}
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed">
            {t.shopDesc}
          </p>
        </div>
      </div>

      {/* Leave a Review - Version optimisée responsive avec logo Star original */}
      <div className="w-full">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4 hover:border-pink-500/50 hover:bg-white/8 transition-all group cursor-pointer">
          <Star className="w-8 h-8 text-white flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold text-white">
              {t.reviewTitle}
            </h2>
            <p className="text-gray-400 text-xs">
              {t.reviewDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}