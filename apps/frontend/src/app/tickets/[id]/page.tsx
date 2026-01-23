"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [canSend, setCanSend] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Désactivation totale des listes et formatages riches
        bulletList: false,
        orderedList: false,
        listItem: false,
        bold: false,
        italic: false,
        codeBlock: false,
        blockquote: false,
        history: true,
      }),
      Placeholder.configure({
        placeholder: "Décrivez votre problème ou répondez ici...",
      }),
    ],
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setCanSend(editor.getText().trim().length > 0);
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none text-sm p-4 min-h-[160px] max-h-[300px] overflow-y-auto custom-editor bg-black/20 text-gray-300",
      },
    },
  });

  const handleSendMessage = async () => {
    if (!editor || editor.isEmpty) return;

    // Récupération du texte brut avec sauts de ligne
    const content = editor.getText({ blockSeparator: "\n" });
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
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        editor.commands.clearContent();
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!id) return;
    const loadTicket = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const res = await fetch(`http://localhost:3001/tickets/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Erreur chargement");
        const ticketData = await res.json();
        setTicket(ticketData);

        const messagesRes = await fetch(`http://localhost:3001/tickets/${id}/messages`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData);
        }
      } catch (err) {
        setTicket(null);
      } finally {
        setLoading(false);
      }
    };
    loadTicket();
  }, [id, router]);

  useEffect(() => {
    if (!ticket) return;
    const calculateProgress = () => {
      const elapsedMs = Date.now() - new Date(ticket.createDate).getTime();
      const percentage = Math.min(Math.round((elapsedMs / (1000 * 60) / 480) * 100), 100);
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
    <div className="w-full px-6 py-8 pb-20">
      {ticket ? (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 text-white">
          {/* SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">Ticket #{ticket.ticketNumber}</h2>
              <div className="space-y-4 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Créé le</span>
                  <span className="text-white">{new Date(ticket.createDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Statut</span>
                  <span className="text-green-400 font-medium">
                    {ticket.status === 5 ? "Résolu" : "En cours"}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h3 className="font-bold mb-3 text-sm">{ticket.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-6">{ticket.description}</p>
            </div>
          </div>

          {/* CONTENU PRINCIPAL */}
          <div className="flex flex-col min-h-[850px] relative">
            <div className="mb-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-gray-300 text-sm font-medium">Progression du ticket</h2>
                <span className="text-gray-500 text-xs font-mono">{Math.round((progress / 100) * 8)}h / 8h</span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full w-full">
                <div
                  className="absolute h-full left-0 top-0 rounded-full bg-gradient-to-r from-pink-600 to-cyan-400 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h3 className="text-xl font-bold mb-6 px-2">Notes et réponses</h3>

            <div className="relative flex-1 flex flex-col min-h-0">
              <div
                ref={scrollRef}
                className="h-[450px] overflow-y-auto space-y-6 py-4 flex flex-col items-center no-scrollbar touch-pan-y"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
                }}
              >
                {messages.map((msg: any) => (
                  <div key={msg.id} className="w-full flex justify-center flex-shrink-0">
                    <div
                      className={`w-[95%] p-6 rounded-2xl relative bg-white/5 backdrop-blur-sm ${
                        msg.userType !== "user" ? "border border-white/10" : ""
                      }`}
                    >
                      {msg.userType === "user" && (
                        <div
                          className="absolute inset-0 rounded-2xl p-[1.5px] pointer-events-none"
                          style={{
                            background: "linear-gradient(to right, #db2777, #06b6d4)",
                            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                            WebkitMaskComposite: "xor",
                            maskComposite: "exclude",
                          }}
                        />
                      )}
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                            msg.userType === "user" ? "bg-pink-600" : "bg-cyan-600"
                          }`}
                        >
                          {msg.authorName?.charAt(0)}
                        </div>
                        <div className="flex flex-col text-xs">
                          <span className="font-bold">{msg.authorName}</span>
                          <span className="text-gray-500">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Affichage en texte brut avec conservation des sauts de ligne */}
                      <div className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ZONE DE SAISIE SANS BARRE D'OUTILS */}
            <div className="mt-6 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-pink-500/50 transition-all shadow-2xl backdrop-blur-md">
                <EditorContent editor={editor} />

                <div className="px-4 py-3 flex justify-end items-center gap-3 bg-white/[0.02]">
                  <input type="file" ref={fileInputRef} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <button
                    onClick={handleSendMessage}
                    disabled={!canSend}
                    className="bg-gradient-to-r from-pink-600 to-pink-500 disabled:opacity-30 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all"
                  >
                    Envoyer
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

        .custom-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #4b5563;
          pointer-events: none;
          height: 0;
        }

        .custom-editor p {
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
}