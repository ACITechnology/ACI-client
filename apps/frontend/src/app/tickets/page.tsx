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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const router = useRouter();

  const ticketsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Calcul des tickets à afficher sur la page actuelle
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);

  // Calcul du nombre total de pages
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  // Génère les numéros de page (ex: [1, 2, 3])
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

  // Déplace cette fonction en dehors du useEffect
  const fetchTickets = async () => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3001/tickets", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 500) {
          attempts++;
          console.log(`Tentative ${attempts} échouée, retry dans 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (!res.ok) throw new Error("Erreur API");

        const data = await res.json();
        const sortedTickets = (data.tickets || []).sort(
          (a: Ticket, b: Ticket) =>
            new Date(b.createDate).getTime() - new Date(a.createDate).getTime()
        );

        setTickets(sortedTickets);
        setLoading(false);
        return;
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("Erreur définitive fetch tickets :", err);
          setLoading(false);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  };

  // Appelle-la au montage
  useEffect(() => {
    fetchTickets();
  }, [user]);

  const getStatusText = (status: number) => {
    if (status === 5) return "Résolu";
    if (status === 26) return "En cours";
    return "Inconnu";
  };

  const getStatusColor = (status: number) => {
    if (status === 5) return "text-green-400";
    if (status === 26) return "text-yellow-400";
    return "text-gray-400";
  };

  const getProgressHours = (createDate: string) => {
    const creationTime = new Date(createDate).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - creationTime) / (1000 * 60);
    const hours = Math.min(Math.floor(elapsedMinutes / 60), 8);
    return `${hours}/8 heures`;
  };

  const getProgressPercentage = (createDate: string) => {
    const creationTime = new Date(createDate).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - creationTime) / (1000 * 60);
    const totalMinutes = 480;
    const percentage = Math.min((elapsedMinutes / totalMinutes) * 100, 100);
    return Math.round(percentage);
  };

  // Protection finale : si pas d'utilisateur → rien à afficher
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
        <p className="text-center text-xl text-gray-400 py-20">
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
                {/* Haut : ID + Date */}
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm text-gray-400">
                    ID: {ticket.ticketNumber}
                  </p>
                  <p className="text-sm text-gray-400">
                    Créé le{" "}
                    {new Date(ticket.createDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                {/* Titre centré */}
                <h3 className="text-2xl font-semibold text-white text-center mb-6 flex-1">
                  {ticket.title}
                </h3>

                {/* Technicien + trait */}
                <div className="text-center mb-8">
                  <p className="text-sm text-gray-400">
                    Technicien : {ticket.assignedResourceName || "Non assigné"}
                  </p>
                  <div className="h-px bg-gray-700 mt-6" />
                </div>

                {/* Bas : statut + barre */}
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

                  <div className="w-full">
                    <div className="bg-gray-800 rounded-full h-4">
                      <div
                        className="bg-pink-600 h-4 rounded-full transition-all duration-1000"
                        style={{
                          width: `${getProgressPercentage(ticket.createDate)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-2">
                      {getProgressHours(ticket.createDate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}

          <div className="flex justify-center gap-4 mt-12">
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => setCurrentPage(number)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-lg border border-pink-500/30 shadow-2xl">
            {/* Titre du modal */}
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Créer un nouveau ticket
            </h2>

            {/* Champ Titre */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Titre du ticket *
              </label>
              <input
                type="text"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Ex: Problème connexion VPN"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                required
              />
            </div>

            {/* Champ Description */}
            <div className="mb-8">
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Description détaillée *
              </label>
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Décrivez votre problème en détail..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-pink-500 transition resize-none"
                required
              />
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setTicketTitle("");
                  setTicketDescription("");
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  // Vérifie que les champs ne sont pas vides
                  if (!ticketTitle.trim() || !ticketDescription.trim()) {
                    alert("Veuillez remplir le titre et la description !");
                    return;
                  }

                  // 1. Créer ticket temporaire
                  const tempTicket: Ticket = {
                    id: Date.now(), // ID temporaire
                    ticketNumber: "TEMP-" + Date.now(),
                    title: ticketTitle,
                    createDate: new Date().toISOString(),
                    assignedResourceName: "En attente",
                    status: 1,
                  };

                  // 2. Ajouter immédiatement à la liste (optimistic)
                  setTickets([tempTicket, ...tickets]);

                  // 3. Continuer avec la requête au backend

                  try {
                    // Récupère le token depuis localStorage
                    const token = localStorage.getItem("token");

                    // Envoie au backend
                    const response = await fetch(
                      "http://localhost:3001/tickets",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          title: ticketTitle,
                          description: ticketDescription,
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Erreur lors de la création"
                      );
                    }

                    const data = await response.json();
                    console.log("Réponse backend création :", data);
                    console.log(
                      "[FRONT DEBUG] Tickets reçus du backend :",
                      data.tickets
                    );

                    alert("Ticket créé avec succès !");

                    // Rafraîchissement avec retry
                    let newTickets = [];
                    for (let attempt = 1; attempt <= 5; attempt++) {
                      console.log(
                        `[FRONT] Tentative ${attempt} pour rafraîchir les tickets`
                      );
                      await new Promise((resolve) => setTimeout(resolve, 3000));

                      const res = await fetch("http://localhost:3001/tickets", {
                        cache: "no-store",
                        headers: { Authorization: `Bearer ${token}` },
                      });

                      const freshData = await res.json();
                      console.log(
                        "[FRONT] Tickets frais tentative",
                        attempt,
                        ":",
                        freshData.tickets
                      );

                      if (freshData.tickets && freshData.tickets.length > 0) {
                        newTickets = freshData.tickets;
                        break;
                      }
                    }

                    if (newTickets.length > 0) {
                      // Remplacer le temporaire par les vrais tickets
                      const updatedTickets = newTickets.map(
                        (ticket: Ticket) => {
                          if (
                            ticket.title === ticketTitle &&
                            ticket.createDate.includes(
                              new Date().toISOString().slice(0, 10)
                            )
                          ) {
                            return ticket; // le vrai ticket
                          }
                          return ticket;
                        }
                      );
                      setTickets(updatedTickets);
                      setNewTicketTemp(null); // ← on supprime le temporaire
                      console.log(
                        "[FRONT] Ticket temporaire remplacé par le vrai"
                      );
                    } else {
                      alert(
                        "Ticket créé, mais pas encore visible. Rafraîchissez la page dans quelques secondes."
                      );
                    }

                    setTicketTitle("");
                    setTicketDescription("");
                    setIsModalOpen(false);
                  } catch (error) {
                    console.error("Erreur création ticket :", error);
                    alert(
                      "Erreur : " +
                        (error.message || "Impossible de créer le ticket")
                    );
                  }
                }}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!ticketTitle.trim() || !ticketDescription.trim()}
              >
                Créer le ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
