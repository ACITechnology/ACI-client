"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(true); // Chargement initial de la page
  const [isCreating, setIsCreating] = useState(false); // Chargement spécifique au bouton "Créer"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const router = useRouter();

  const ticketsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  // Fallback si la DB est vide ou en erreur
  const fetchTicketsFromApi = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/tickets", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Erreur fetch tickets API :", err);
    }
  };

  const loadTicketsFromDb = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      //console.log("[FRONT] Tentative de chargement DB...");
      //console.log("[FRONT] Token présent :", !!token);
      //console.log("[FRONT] User ID envoyé :", userData.id);

      if (!token) {
        console.warn("[FRONT] Aucun token trouvé dans le localStorage");
        router.push("/login");
        return;
      }

      const res = await fetch("http://localhost:3001/tickets/db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userData.id }),
      });

      //console.log("[FRONT] Statut réponse serveur :", res.status);

      if (res.status === 401) {
        console.error("[FRONT] Erreur 401 : Token invalide ou expiré");
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (!res.ok) throw new Error(`Erreur DB (Status: ${res.status})`);

      const dbTickets = await res.json();
      //console.log("[FRONT] Données reçues brutes :", dbTickets);

      const ticketsArray = Array.isArray(dbTickets)
        ? dbTickets
        : dbTickets.tickets || [];
      //console.log("[FRONT] Nombre de tickets traités :", ticketsArray.length);

      const sortedTickets = ticketsArray.sort(
        (a: Ticket, b: Ticket) =>
          new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
      );

      setTickets(sortedTickets);
    } catch (err) {
      console.error("[FRONT] Erreur critique dans loadTicketsFromDb :", err);
      await fetchTicketsFromApi();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTicketsFromDb();
  }, [user]);

  const getStatusText = (status: number) => {
    if (status === 5) return "Résolu";
    if (status === 26) return "En cours";
    return "Nouveau";
  };

  const getProgressPercentage = (createDate: string) => {
    const creationTime = new Date(createDate).getTime();
    const elapsedMinutes = (Date.now() - creationTime) / (1000 * 60);
    return Math.min(Math.round((elapsedMinutes / 480) * 100), 100);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-4xl font-bold text-white">Vos Tickets</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-4 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-medium transition shadow-lg"
        >
          + Créer un ticket
        </button>
      </div>

      {loading ? (
        <p className="text-center text-xl text-gray-400 py-20 animate-pulse">
          Chargement des tickets...
        </p>
      ) : tickets.length === 0 ? (
        <p className="text-center text-xl text-gray-400 py-20">
          Aucun ticket trouvé.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:border-pink-500/50 hover:bg-white/8 transition min-h-80 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm text-gray-400">
                    #{ticket.ticketNumber}
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Date(ticket.createDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <h3 className="text-2xl font-semibold text-white text-center mb-6 flex-1">
                  {ticket.title}
                </h3>

                <div className="text-center mb-8">
                  <p className="text-sm text-gray-400">
                    Technicien : {ticket.assignedResourceName || "En attente"}
                  </p>
                  <div className="h-px bg-gray-700 mt-6" />
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        ticket.status === 5 ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        ticket.status === 5
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {getStatusText(ticket.status)}
                    </span>
                  </div>

                  <div className="bg-gray-800 rounded-full h-3">
                    <div
                      className="bg-pink-600 h-3 rounded-full transition-all duration-1000"
                      style={{
                        width: `${getProgressPercentage(ticket.createDate)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-12">
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => setCurrentPage(number)}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === number
                    ? "bg-pink-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {number}
              </button>
            ))}
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-lg border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Nouveau Ticket
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">
                  Titre
                </label>
                <input
                  type="text"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-pink-500 outline-none transition"
                  placeholder="Problème..."
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">
                  Description
                </label>
                <textarea
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-pink-500 outline-none transition resize-none"
                  placeholder="Détails..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                disabled={isCreating}
                onClick={() => {
                  setIsModalOpen(false);
                  setTicketTitle("");
                  setTicketDescription("");
                }}
                className="px-6 py-3 text-gray-400 hover:text-white transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                disabled={
                  isCreating || !ticketTitle.trim() || !ticketDescription.trim()
                }
                onClick={async () => {
                  setIsCreating(true);
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch("http://localhost:3001/tickets", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      // On envoie le userId pour que le backend sache à qui lier le ticket en DB locale
                      body: JSON.stringify({
                        title: ticketTitle,
                        description: ticketDescription,
                        userId: user.id,
                      }),
                    });

                    if (!res.ok) throw new Error("Erreur lors de la création");

                    const responseData = await res.json();
                    const newTicket = responseData.data; // On récupère le ticket créé renvoyé par le backend

                    // --- OPTIMISATION : MISE À JOUR IMMÉDIATE DE L'INTERFACE ---
                    // On ajoute le nouveau ticket au début de la liste sans refaire de requête fetch
                    setTickets((prevTickets) => [newTicket, ...prevTickets]);

                    // On ferme la modale et on vide les champs
                    setIsModalOpen(false);
                    setTicketTitle("");
                    setTicketDescription("");
                  } catch (error: any) {
                    alert(error.message);
                  } finally {
                    setIsCreating(false);
                  }
                }}
                className="px-8 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl text-white font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Création...
                  </>
                ) : (
                  "Créer le ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
