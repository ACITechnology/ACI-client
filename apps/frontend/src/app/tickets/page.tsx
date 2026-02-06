"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  createDate: string;
  assignedResourceName?: string;
  status: number;
  autotaskTicketId?: string;
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
  const [goToPage, setGoToPage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  const router = useRouter();

  // --- CHARGEMENT INITIAL & AUTH ---
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    console.log("[DEBUG TICKETS] Montage du composant");
    console.log("[DEBUG TICKETS] Token présent ?", !!storedToken);
    console.log("[DEBUG TICKETS] User présent ?", !!storedUser);

    if (!storedUser || !storedToken) {
      console.warn("[DEBUG TICKETS] Manque user ou token -> Redirection Login");
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [router]);

  // --- RÉCUPÉRATION DES TICKETS ---
  const loadTicketsFromDb = useCallback(async () => {
    // 1. Récupération
    let token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // 2. NETTOYAGE : Si le token contient des " au début et à la fin, on les enlève
    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

    if (!token || !currentUser?.id) {
      console.log("[DEBUG TICKETS] Token ou User manquant");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/db`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // On s'assure que token est propre ici
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.status === 401) {
        console.error("Token invalide ou expiré");
        router.push("/login");
        return;
      }

      const dbTickets = await res.json();
      const ticketsArray = Array.isArray(dbTickets)
        ? dbTickets
        : dbTickets.data || [];
      setTickets(
        ticketsArray.sort(
          (a: any, b: any) =>
            new Date(b.createDate).getTime() - new Date(a.createDate).getTime(),
        ),
      );
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.id) {
      loadTicketsFromDb();
    }
  }, [user, loadTicketsFromDb]);

  // --- LOGIQUE SOCKET (ÉCOUTE DU WORKER) ---
  // --- LOGIQUE SOCKET (ÉCOUTE DU WORKER) ---
useEffect(() => {
  if (!user?.id) return;

  // Utilisation de l'URL propre (sans /api) pour Socket.io
  const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "";
  
  const newSocket = io(socketUrl, {
    transports: ["websocket"], // Évite le polling HTTP qui peut échouer
    reconnectionAttempts: 5,
  });

  setSocket(newSocket);

  const channel = `ticket_finalized_${user.id}`;

  newSocket.on("connect", () => {
    console.log("[DEBUG SOCKET] Connecté au serveur avec ID:", newSocket.id);
  });

  newSocket.on(channel, (updatedTicket: Ticket) => {
    console.log(`[FRONTEND] 📥 Message reçu sur ${channel}`, updatedTicket);

    setCreateProgress(100);

    setTimeout(() => {
      setTickets((prev) => {
        // On cherche si le ticket existe déjà (soit par ID, soit par numéro de ticket)
        const exists = prev.find(t => 
          t.id === updatedTicket.id || 
          t.ticketNumber === updatedTicket.ticketNumber ||
          (t.ticketNumber && t.ticketNumber.startsWith("TEMP"))
        );

        if (exists) {
          // On remplace le temporaire par le ticket final
          return prev.map((t) =>
            (t.id === updatedTicket.id || t.ticketNumber === updatedTicket.ticketNumber || t.ticketNumber.startsWith("TEMP"))
              ? updatedTicket
              : t
          );
        } else {
          // Si par hasard il n'est pas dans la liste, on l'ajoute au début
          return [updatedTicket, ...prev];
        }
      });

      // Nettoyage de l'interface de création
      setIsModalOpen(false);
      setIsCreating(false);
      setCreateProgress(0);
      setTicketTitle("");
      setTicketDescription("");
      
      // Sécurité : on recharge quand même depuis la DB pour synchroniser tout
      loadTicketsFromDb();
    }, 1000);
  });

  // NETTOYAGE CRITIQUE : Se déclenche quand on quitte la page ou que l'user change
  return () => {
    console.log("[DEBUG SOCKET] Déconnexion et nettoyage...");
    newSocket.off(channel);
    newSocket.disconnect();
  };
}, [user?.id, loadTicketsFromDb]); // On utilise user.id pour éviter les re-rendus inutiles

  // --- LOGIQUE DE CRÉATION ---
  const handleCreateTicket = async () => {
    if (!ticketTitle.trim() || !ticketDescription.trim()) return;

    setIsCreating(true);
    setCreateProgress(10);
    setCreateError(null);

    const progressInterval = setInterval(() => {
      setCreateProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 1;
      });
    }, 150);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
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
      const tempTicket = responseData.data;

      // Ajoute le ticket "en attente" à la liste
      setTickets((prev) => [tempTicket, ...prev]);

      // On laisse l'overlay afficher 95% jusqu'à l'event Socket
    } catch (error: any) {
      clearInterval(progressInterval);
      setCreateError(error.message);
      setTimeout(() => setIsCreating(false), 2000);
    }
  };

  // --- PAGINATION ---
  const ticketsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, currentPage - 4),
    Math.min(totalPages, currentPage + 4),
  );

  // --- HELPERS ---
  const getStatusText = (status: number) =>
    status === 5 ? "Résolu" : status === 26 ? "En cours" : "Nouveau";
  const getProgressPercentage = (date: string) => {
    const elapsed = (Date.now() - new Date(date).getTime()) / (1000 * 60);
    return Math.min(Math.round((elapsed / 480) * 100), 100);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-9 -mt-[2vh] md:-mt-[5vh]">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Vos Tickets
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-medium transition shadow-lg text-sm"
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
          {/* GRILLE 6 SLOTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
            {[...Array(6)].map((_, index) => {
              const ticket = currentTickets[index];
              if (ticket) {
                return (
                  <div
                    key={ticket.id}
                    onClick={() =>
                      router.push(
                        `/tickets/${ticket.autotaskTicketId || ticket.id}`,
                      )
                    }
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 md:p-6 hover:border-pink-500/50 transition flex flex-col h-72 cursor-pointer group"
                  >
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>#{ticket.ticketNumber}</span>
                      <span>
                        {new Date(ticket.createDate).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                    </div>

                    {/* TITRE : Forme originale respectée */}
                    <h3 className="text-lg md:text-xl font-semibold text-white text-center mb-4 flex-1 line-clamp-2 group-hover:text-pink-400 transition-colors">
                      {ticket.title}
                    </h3>

                    <div className="text-center mb-6 text-xs text-gray-400">
                      Technicien :{" "}
                      <span className="text-gray-200">
                        {ticket.assignedResourceName || "En attente"}
                      </span>
                      <div className="h-px bg-gray-700/50 mt-4" />
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div
                          className={`w-2 h-2 rounded-full ${ticket.status === 5 ? "bg-green-500" : "bg-yellow-500"}`}
                        />
                        <span
                          className={
                            ticket.status === 5
                              ? "text-green-400 text-[11px]"
                              : "text-yellow-400 text-[11px]"
                          }
                        >
                          {getStatusText(ticket.status)}
                        </span>
                      </div>
                      <div className="bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-pink-600 h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: `${getProgressPercentage(ticket.createDate)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={`empty-${index}`}
                  className="hidden sm:block h-72 opacity-0 pointer-events-none"
                />
              );
            })}
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col items-center gap-6 mt-12 pb-10">
            <div className="flex flex-wrap justify-center gap-2">
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setCurrentPage(n)}
                  className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg text-sm transition ${currentPage === n ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400">
                <span>Aller à la page :</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={goToPage}
                    onChange={(e) => setGoToPage(e.target.value)}
                    /* Classes pour enlever les flèches du champ number */
                    className="w-14 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-pink-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      const page = parseInt(goToPage);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                        setGoToPage("");
                      }
                    }}
                    className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-5 md:p-6 w-full max-w-xl border border-pink-500/30 shadow-2xl max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-5 text-center">
              Nouveau Ticket
            </h2>
            <div className="space-y-4">
              <input
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-pink-500 text-sm"
                placeholder="Titre de votre ticket"
              />
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-pink-500 resize-none text-sm min-h-[120px]"
                placeholder="Decrivez en détails votre problème, soyez le plus précis possible..."
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="order-2 sm:order-1 px-5 py-3 text-gray-400 hover:text-white text-sm"
              >
                Annuler
              </button>
              <button
                disabled={isCreating || !ticketTitle.trim()}
                onClick={handleCreateTicket}
                className="order-1 sm:order-2 px-6 py-3 bg-pink-600 rounded-xl text-white font-bold disabled:opacity-50 text-sm hover:bg-pink-700 transition"
              >
                {isCreating ? "Création..." : "Créer le ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY PROGRESSION */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-center">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex justify-center mb-6">
              {createError ? (
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold">
                  !
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full border-4 ${createProgress < 100 ? "border-pink-600/20 border-t-pink-600 animate-spin" : "border-green-500"}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-pink-500 font-bold text-xs">
                    {Math.round(createProgress)}%
                  </div>
                </div>
              )}
            </div>
            <h2
              className={`text-lg font-bold mb-2 ${createError ? "text-red-500" : "text-white"}`}
            >
              {createError
                ? "Échec de la création"
                : createProgress < 100
                  ? "Création en cours..."
                  : "Ticket créé !"}
            </h2>
            {!createError ? (
              <div className="w-full bg-white/5 rounded-full h-2 mt-4 overflow-hidden">
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
                className="mt-4 w-full py-3 bg-gray-800 text-white rounded-xl text-sm font-medium"
              >
                Réessayer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
