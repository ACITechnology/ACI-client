import { Ticket, Radio, ShoppingCart, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center py-4 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Client Portal</h1>
        <p className="text-base text-gray-400 max-w-2xl mx-auto">
          Welcome back. Manage your services, support tickets, and devices all in one place.
        </p>
      </div>

      {/* Grid : 3 cartes + Your Tickets plus large */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-8">
        {/* Your Tickets – 2 colonnes */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Ticket className="w-12 h-12 text-pink-500 mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">Your Tickets</h2>
          <p className="text-gray-400 text-sm">Manage and create support requests</p>
        </div>

        {/* Remote Control */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Radio className="w-12 h-12 text-white mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">Remote Control</h2>
          <p className="text-gray-400 text-sm">Download support tools</p>
        </div>

        {/* Shop */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center hover:border-pink-500/50 hover:bg-white/8 transition group">
          <ShoppingCart className="w-12 h-12 text-white mx-auto mb-5 group-hover:scale-110 transition" />
          <h2 className="text-xl font-semibold text-white mb-2">Shop</h2>
          <p className="text-gray-400 text-sm">Explore our products</p>
        </div>
      </div>

      {/* Leave a Review – pleine largeur, plus petite en hauteur, icône à gauche */}
      <div className="lg:col-span-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 flex items-center gap-6 hover:border-pink-500/50 hover:bg-white/8 transition group">
          <Star className="w-10 h-10 text-white flex-shrink-0 group-hover:scale-110 transition" />
          <div>
            <h2 className="text-xl font-semibold text-white">Leave a Review</h2>
            <p className="text-gray-400 text-sm">Share your experience on Google</p>
          </div>
        </div>
      </div>
    </div>
  );
}