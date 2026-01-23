"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  createDate: string;
  assignedResourceName?: string;
  status: number;
}

export default function TicketsPage() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [goToPage, setGoToPage] = useState(""); // Pour le champ "Aller à la page"
  const router = useRouter();

  // Pagination
  const ticketsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  // Génération des numéros de page (max 8 affichés)
  const maxPagesShown = 8;
  const halfShown = Math.floor(maxPagesShown / 2);
  let startPage = Math.max(1, currentPage - halfShown);
  let endPage = Math.min(totalPages, startPage + maxPagesShown - 1);

  // Ajustement si on est près de la fin
  if (endPage - startPage + 1 < maxPagesShown) {
    startPage = Math.max(1, endPage - maxPagesShown + 1);
  }

  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  );

  // --- LOGIQUE DE CRÉATION ---
  const handleCreateTicket = async () => {
    if (!ticketTitle.trim() || !ticketDescription.trim()) return;

    setIsCreating(true);
    setCreateProgress(5);
    setCreateError(null);

    const progressInterval = setInterval(() => {
      setCreateProgress((prev) => (prev < 95 ? prev + (95 - prev) / 20 : prev));
    }, 200);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: ticketTitle,
          description: ticketDescription,
          userId: user.id,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la création");

      const responseData = await res.json();
      const newTicket = responseData.data;

      clearInterval(progressInterval);
      setCreateProgress(100);

      setTimeout(() => {
        setTickets((prev) => [newTicket, ...prev]);
        setIsModalOpen(false);
        setIsCreating(false);
        setTicketTitle("");
        setTicketDescription("");
        setCreateProgress(0);
      }, 800);
    } catch (error: any) {
      clearInterval(progressInterval);
      setCreateError(error.message);
    }
  };

  // --- CHARGEMENT ---
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const loadTicketsFromDb = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/tickets/db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      console.log("[DB LOAD] Status code reçu :", res.status); // ← AJOUT 1
      if (!res.ok) {
        const errorText = await res.text(); // ← AJOUT 2
        console.log("[DB LOAD] Erreur complète :", errorText); // ← AJOUT 3
        throw new Error(`Erreur DB - Status ${res.status}`);
      }
      const dbTickets = await res.json();
      const sorted = dbTickets.sort(
        (a: any, b: any) =>
          new Date(b.createDate).getTime() - new Date(a.createDate).getTime(),
      );
      setTickets(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTicketsFromDb();
  }, [user]);

  // Helpers
  const getStatusText = (status: number) =>
    status === 5 ? "Résolu" : status === 26 ? "En cours" : "Nouveau";

  const getProgressPercentage = (date: string) => {
    const elapsed = (Date.now() - new Date(date).getTime()) / (1000 * 60);
    return Math.min(Math.round((elapsed / 480) * 100), 100);
  };

  // Aller à une page spécifique
  const handleGoToPage = () => {
    const pageNum = parseInt(goToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setGoToPage("");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-9 -mt-[5vh]">
      <div className="flex items-center justify-between mb-9">
        <h1 className="text-3xl font-bold text-white">Vos Tickets</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-medium transition shadow-lg text-sm"
        >
          + Créer un ticket
        </button>
      </div>

      {loading ? (
        <p className="text-center text-lg text-gray-400 py-16 animate-pulse">
          Chargement...
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.autotaskTicketId}`}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition flex flex-col min-h-72 block"
              >
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>#{ticket.ticketNumber}</span>
                </div>
                <div className="text-[10px] text-gray-400 mb-4">
                  Créé le{" "}
                  {new Date(ticket.createDate).toLocaleDateString("fr-FR")}
                </div>
                <h3 className="text-xl font-semibold text-white text-center mb-4 flex-1">
                  {ticket.title}
                </h3>
                <div className="text-center mb-6 text-xs text-gray-400">
                  Technicien : {ticket.assignedResourceName || "En attente"}
                  <div className="h-px bg-gray-700 mt-4" />
                </div>
                <div className="mt-auto">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        ticket.status === 5 ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span
                      className={
                        ticket.status === 5
                          ? "text-green-400 text-xs"
                          : "text-yellow-400 text-xs"
                      }
                    >
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-pink-600 h-2.5 rounded-full transition-all duration-1000"
                      style={{
                        width: `${getProgressPercentage(ticket.createDate)}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center gap-4 mt-9">
            <div className="flex justify-center gap-3">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setCurrentPage(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    currentPage === n
                      ? "bg-pink-600 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Champ "Aller à la page" si + de 8 pages */}
            {totalPages > 8 && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>Aller à la page :</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-pink-500"
                />
                <button
                  onClick={() => {
                    const page = parseInt(goToPage);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                      setGoToPage("");
                    }
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition"
                >
                  Aller
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-xl border border-pink-500/30 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 text-center">
              Nouveau Ticket
            </h2>
            <div className="space-y-5">
              <input
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-pink-500 text-sm"
                placeholder="Entrez le titre de votre problème (ex: Connexion VPN impossible)"
              />
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={10}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-pink-500 resize-none text-sm min-h-[140px]"
                placeholder="Décrivez votre problème avec le plus de détails possibles (symptômes, ce que vous avez essayé, captures d'écran si possible...)"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-gray-400 hover:text-white text-sm"
              >
                Annuler
              </button>
              <button
                disabled={isCreating || !ticketTitle.trim()}
                onClick={handleCreateTicket}
                className="px-6 py-2.5 bg-pink-600 rounded-xl text-white font-bold disabled:opacity-50 text-sm"
              >
                {isCreating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de progression */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-center mb-5">
              {createError ? (
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold">
                  !
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full border-4 ${
                      createProgress < 100
                        ? "border-pink-600/20 border-t-pink-600 animate-spin"
                        : "border-green-500"
                    }`}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-pink-500 font-bold text-xs">
                    {Math.round(createProgress)}%
                  </div>
                </div>
              )}
            </div>

            <h2
              className={`text-xl font-bold text-center mb-1.5 ${
                createError ? "text-red-500" : "text-white"
              }`}
            >
              {createError
                ? "Échec de la création"
                : createProgress < 100
                  ? "Création du ticket..."
                  : "Ticket créé !"}
            </h2>

            <p className="text-gray-400 text-center text-xs mb-6">
              {createError
                ? createError
                : createProgress < 100
                  ? "Enregistrement dans Autotask..."
                  : "Votre ticket a été enregistré avec succès."}
            </p>

            {!createError ? (
              <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-pink-600 h-full transition-all duration-500"
                  style={{ width: `${createProgress}%` }}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsCreating(false);
                  setCreateError(null);
                }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition font-medium text-sm"
              >
                Fermer et réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
