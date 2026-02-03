"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [issending, setIsSending] = useState(false); // Ajoute ce state en haut

  const handleSendMessage = async () => {
  if (!content.trim() || issending) return;
  setIsSending(true);

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`http://localhost:3001/tickets/${id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: content.trim() }),
    });

    if (res.ok) {
      const result = await res.json();
      
      const newMessageForUI = {
        id: result.id || Date.now(),
        content: content.trim(), 
        authorName: "Moi", // On force "Moi" ici
        userType: "user",
        createdAt: new Date().toISOString(),
        sourceType: "local"
      };

      setMessages((prev) => [...prev, newMessageForUI]);
      setContent("");
      setTimeout(scrollToBottom, 100);
    }
  } catch (err) {
    console.error("Erreur envoi:", err);
  } finally {
    setIsSending(false);
  }
};

  useEffect(() => {
  if (!id) return;
  let retryCount = 0;

  const loadTicket = async () => {
    console.log(`🔍 [${retryCount}] Tentative de récupération du ticket : ${id}`);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3001/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`📡 Réponse serveur : Statut ${res.status}`);

      if (!res.ok) {
        // Condition spécifique pour le ticket en cours de création
        if (res.status === 404 && id.toString().startsWith("-")) {
          if (retryCount < 10) { // On est plus patient (10 fois)
            retryCount++;
            console.warn(`⏳ Le Worker n'a pas encore fini. Nouvel essai dans 2s... (${retryCount}/10)`);
            setTimeout(loadTicket, 2000);
            return; // ⚠️ TRES IMPORTANT : On sort ici sans jeter d'erreur
          } else {
            console.error("❌ Timeout : Le Worker a mis trop de temps (> 20s).");
          }
        }
        
        // Si on est ici, c'est que soit ce n'est pas un ID négatif, soit on a épuisé les retries
        console.error("🛑 Arrêt définitif : Ticket introuvable.");
        setTicket(null);
        setLoading(false);
        return;
      }

      const ticketData = await res.json();
      console.log("✅ Ticket récupéré avec succès !", ticketData);
      setTicket(ticketData);

      // Chargement des messages
      const messagesRes = await fetch(`http://localhost:3001/tickets/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        console.log(`💬 ${data.length} messages récupérés.`);
        setMessages(data);
      }

      setLoading(false);
    } catch (err) {
      console.error("💥 Erreur critique dans loadTicket :", err);
      setLoading(false);
    }
  };

  loadTicket();
}, [id, router]);

  useEffect(() => {
    if (!ticket) return;
    const calculateProgress = () => {
      const elapsedMs = Date.now() - new Date(ticket.createDate).getTime();
      const percentage = Math.min(
        Math.round((elapsedMs / (1000 * 60) / 480) * 100),
        100,
      );
      setProgress(percentage);
    };
    calculateProgress();
    const interval = setInterval(calculateProgress, 60000);
    return () => clearInterval(interval);
  }, [ticket]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 animate-pulse">
        Chargement...
      </div>
    );

  return (
    <div className="w-full px-4 lg:px-6 pt-0 pb-10 flex flex-col min-h-screen -mt-[2vh] md:-mt-[5vh]">
      <nav className="flex items-center gap-2 mb-4 group flex-shrink-0">
        <button
          onClick={() => router.push("/tickets")}
          className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors text-sm font-medium"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour aux tickets
        </button>
      </nav>

      {ticket ? (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 text-white md:h-[820px] h-auto">
          {/* SIDEBAR GAUCHE */}
          <div className="flex flex-col gap-3 md:h-full h-auto overflow-hidden">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl flex-shrink-0">
              <h2 className="text-sm font-bold mb-4 text-gray-300">
                Ticket #{ticket.ticketNumber}
              </h2>
              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Créé le</span>
                  <span className="text-white">
                    {new Date(ticket.createDate).toLocaleString("fr-FR", {
                      hour12: false,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Modifié le</span>
                  <span className="text-white">
                    {ticket.lastActivityDate
                      ? new Date(ticket.lastActivityDate).toLocaleString(
                          "fr-FR",
                          { hour12: false },
                        )
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Statut</span>
                  <span className="text-green-400 font-medium">
                    {ticket.status === 5 ? "Résolu" : "En cours"}
                  </span>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 my-4" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold border border-white/10 shadow-lg">
                  {ticket.assignedResourceName?.charAt(0) || "T"}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">
                    {ticket.assignedResourceName || "Technicien inconnu"}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1">
                    Technicien assigné
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl flex-shrink-0 h-[100px]">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-gray-300 text-xs font-medium tracking-tighter">
                  Progression
                </h2>
                <span className="text-gray-500 text-[10px] font-mono">
                  {Math.round((progress / 100) * 8)}h / 8h
                </span>
              </div>
              <div className="relative h-2 bg-gray-800 rounded-full w-full">
                <div
                  className="absolute h-full left-0 top-0 rounded-full bg-gradient-to-r from-pink-600 to-cyan-400 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl flex flex-col md:flex-grow min-h-[200px] md:min-h-0">
              <h4 className="text-white font-medium mb-3 text-sm leading-tight flex-shrink-0">
                {ticket.title}
              </h4>
              <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {ticket.description}
                </p>
              </div>
            </div>
          </div>

          {/* MESSAGERIE */}
          <div className="flex flex-col md:h-full h-[600px] overflow-hidden">
            <h3 className="text-xl font-bold mb-6 px-2 flex-shrink-0">
              Notes et réponses
            </h3>

            <div className="relative flex-grow min-h-0 overflow-hidden">
              <div
                ref={scrollRef}
                className="h-full overflow-y-auto space-y-6 py-10 flex flex-col no-scrollbar touch-pan-y px-2"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
                }}
              >
                {/* Remplace la ligne 161 à 164 environ par ceci */}
                {messages.map((msg: any, index: number) => {
                  const isUser = msg.userType === "user";
                  // On génère une clé unique en combinant le type de source et l'ID (ou l'index)
                  const uniqueKey = msg.id
                    ? `${msg.sourceType}-${msg.id}`
                    : `temp-${index}`;

                  return (
                    <div
                      key={uniqueKey}
                      className={`w-full flex ${isUser ? "justify-end" : "justify-start"} flex-shrink-0`}
                    >
                      <div
                        className={`
                        max-w-[85%] md:max-w-[70%] p-5 rounded-2xl shadow-2xl transition-all border-none backdrop-blur-sm
                        ${isUser ? "bg-pink-500/50 text-white" : "bg-cyan-500/50 text-white"}
                      `}
                      >
                        <div className="flex items-center gap-3 mb-2 text-left">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white/20 flex-shrink-0 ${isUser ? "bg-pink-600" : "bg-cyan-600"}`}
                          >
                            {msg.authorName?.charAt(0)}
                          </div>
                          <div className="flex flex-col text-[10px] leading-tight">
                            <span className="font-black uppercase tracking-tighter opacity-90">
                              {isUser ? "Moi" : msg.authorName}
                            </span>
                            <span className="opacity-70 font-medium">
                              {new Date(msg.createdAt).toLocaleString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm font-medium whitespace-pre-wrap break-words leading-snug">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ZONE DE SAISIE */}
            <div className="mt-4 flex-shrink-0 pb-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-pink-500/50 transition-all shadow-2xl">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="w-full bg-black/40 text-white text-sm p-5 h-[100px] md:h-[120px] focus:outline-none resize-none placeholder:text-gray-600"
                />
                <div className="px-4 py-3 flex justify-end items-center gap-3 bg-white/[0.02]">
                  <input type="file" ref={fileInputRef} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-white transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!content.trim() || issending} // Ajoute issending ici
                    className="bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    {issending ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.3);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
