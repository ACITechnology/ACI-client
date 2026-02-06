"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Trash2, UserPlus, CheckCircle2, Loader2 } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  
  // États pour la création d'utilisateur
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "", companyId: ""
  });
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCompanyResults, setShowCompanyResults] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");
  const usersPerPage = 10;

  // Regex de sécurité : 8 caractères, 1 majuscule, 1 chiffre, 1 spécial
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/admin/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      // Petit délai pour éviter le flash visuel si la réponse est trop rapide
      setTimeout(() => setLoading(false), 500);
    }
  };

  const searchCompanies = async (query: string) => {
    setCompanyName(query);
    if (query.length < 2) { setCompanies([]); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/company/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setCompanies(data);
      setShowCompanyResults(true);
    } catch (err) { console.error(err); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (formData.password !== formData.confirmPassword) {
      setCreateError("Les mots de passe ne correspondent pas");
      return;
    }

    if (!passwordRegex.test(formData.password)) {
      setCreateError("Sécurité : 8 caractères min, 1 majuscule, 1 chiffre, 1 spécial");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.toLowerCase(),
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyId: Number(formData.companyId) 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de la création");
      
      setCreateSuccess(true);
      fetchUsers();
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
        setFormData({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", companyId: "" });
        setCompanyName("");
      }, 2000);
    } catch (err: any) { setCreateError(err.message); }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmInput !== "DELETE") return;
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    setDeleteConfirmInput("");
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 4), Math.min(totalPages, currentPage + 4));

  // Style harmonisé pour tous les inputs (Email et Password inclus)
  const inputStyle = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-pink-500 transition-all font-medium placeholder:text-gray-700";

  // ÉCRAN DE CHARGEMENT AMÉLIORÉ
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-50">
        <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-white/5"></div>
            <div className="absolute w-20 h-20 rounded-full border-t-2 border-pink-600 animate-spin"></div>
            <Loader2 className="absolute w-6 h-6 text-pink-600 animate-pulse" />
        </div>
        <p className="mt-6 text-gray-500 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">
            Chargement de l'annuaire
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-9 -mt-[2vh] md:-mt-[5vh] animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gestion Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Annuaire et contrôle des accès</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-bold transition shadow-lg text-xs flex items-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Créer un utilisateur</span>
        </button>
      </div>

      {/* TABLEAU */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10">
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">ID Local</th>
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">ID Autotask</th>
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Nom complet</th>
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Email</th>
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Rôle</th>
                <th className="px-6 py-5 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Entreprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {currentUsers.map((u) => (
                <tr key={u.id} onClick={() => setSelectedUser(u)} className="hover:bg-white/[0.03] transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-mono text-pink-500 font-bold text-xs">#{u.id}</td>
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs">{u.autotaskContactId || "---"}</td>
                  <td className="px-6 py-4 font-semibold text-gray-200 group-hover:text-pink-400 transition-colors">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-gray-400">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${u.role === 'admin' ? 'bg-pink-500/10 text-pink-500' : 'bg-cyan-500/10 text-cyan-400'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs font-medium">{u.company?.name || "Individuel"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col items-center gap-6 mt-12 pb-10">
        <div className="flex justify-center gap-2">
          {pageNumbers.map((n) => (
            <button key={n} onClick={() => setCurrentPage(n)} className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg text-sm transition ${currentPage === n ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {n}
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>Aller à :</span>
            <input type="number" value={goToPage} onChange={(e) => setGoToPage(e.target.value)} className="w-12 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center focus:border-pink-500 outline-none" />
            <button onClick={() => { const p = parseInt(goToPage); if (p >= 1 && p <= totalPages) setCurrentPage(p); setGoToPage(""); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition">OK</button>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION - STYLE HARMONISÉ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-xl border border-pink-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {createSuccess ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <h3 className="text-xl font-bold text-white">Utilisateur créé avec succès</h3>
              </div>
            ) : (
              <>
                <div className="p-6 flex justify-between items-start bg-white/[0.02] border-b border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Administration</span>
                    <h2 className="text-xl font-bold text-white tracking-tight">Nouvel utilisateur</h2>
                  </div>
                  <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="p-8 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Prénom</label>
                      <input type="text" required className={inputStyle} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Nom</label>
                      <input type="text" required className={inputStyle} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Adresse E-mail</label>
                    <input type="email" required className={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Entreprise</label>
                    <input type="text" placeholder="Rechercher..." className={inputStyle} value={companyName} onChange={e => searchCompanies(e.target.value)} autoComplete="off" />
                    {showCompanyResults && companies.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                        {companies.map(c => (
                          <div key={c.id} className="p-3 hover:bg-white/5 cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0" onClick={() => { setFormData({...formData, companyId: c.id.toString()}); setCompanyName(c.name); setShowCompanyResults(false); }}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Mot de passe</label>
                      <input type="password" required className={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Confirmation</label>
                      <input type="password" required className={inputStyle} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                    </div>
                  </div>
                  
                  {createError && <p className="text-red-500 text-[10px] text-center font-bold uppercase tracking-widest bg-red-500/5 py-2 rounded-lg border border-red-500/10">{createError}</p>}
                  
                  <div className="pt-2">
                    <button type="submit" className="w-full py-4 bg-pink-600 hover:bg-pink-700 rounded-xl text-white font-bold text-sm shadow-lg shadow-pink-600/20 transition-all active:scale-95">
                      Créer le compte utilisateur
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* POPUP DÉTAILS */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-xl border border-pink-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 flex justify-between items-start bg-white/[0.02]">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Détails du compte</span>
                <h2 className="text-xl font-bold text-white">{selectedUser.firstName} {selectedUser.lastName}</h2>
                <span className="text-[11px] text-pink-500 font-mono font-bold tracking-tight">ID Local: #{selectedUser.id}</span>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-1"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">E-mail</p><p className="text-gray-200 text-sm font-medium">{selectedUser.email}</p></div>
                <div className="space-y-1"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Téléphone</p><p className="text-gray-200 text-sm font-medium">{selectedUser.phone || "---"}</p></div>
                <div className="space-y-1"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">ID Autotask</p><p className="text-gray-200 text-sm font-mono font-medium">{selectedUser.autotaskContactId || "Non synchronisé"}</p></div>
                <div className="space-y-1"><p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Dernière Connexion</p><p className="text-gray-200 text-sm font-medium">---</p></div>
              </div>
              <div className="mt-12 flex justify-end pt-6 border-t border-white/5">
                <button onClick={() => { setDeleteConfirmInput(""); setIsDeleteModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-wider group"><Trash2 className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />Supprimer l'utilisateur</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-pink-500/20 p-8 rounded-2xl max-w-sm w-full shadow-2xl text-center">
            <div className="w-14 h-14 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500"><AlertTriangle className="w-7 h-7" /></div>
            <h3 className="text-lg font-bold text-white mb-2">Action irréversible</h3>
            <p className="text-gray-400 text-xs mb-6">Tapez <span className="text-white font-bold tracking-widest">DELETE</span> pour supprimer <b>{selectedUser.firstName}</b> :</p>
            <input type="text" value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} placeholder="DELETE" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-pink-500 text-center text-sm mb-6 font-bold uppercase tracking-widest" />
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-white/5 rounded-xl text-sm text-gray-300">Annuler</button>
              <button disabled={deleteConfirmInput !== "DELETE"} onClick={handleDeleteUser} className={`flex-1 py-3 rounded-xl font-bold text-sm text-white ${deleteConfirmInput === "DELETE" ? "bg-pink-600" : "bg-gray-800 opacity-30 cursor-not-allowed"}`}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}