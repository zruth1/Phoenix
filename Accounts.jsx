import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking", icon: "🏦" },
  { value: "savings", label: "Savings", icon: "💰" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "investment", label: "Investment", icon: "📈" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "other", label: "Other", icon: "📂" },
];

const TYPE_COLORS = {
  checking: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  savings: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  credit_card: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  investment: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  cash: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  other: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" },
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function getTypeInfo(type) {
  return ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[5];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    account_type: "checking",
    balance: "",
    institution: "",
    is_primary: false,
    notes: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("mm_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error) setAccounts(data || []);
    setLoading(false);
  }

  function openAdd() {
    setForm({ name: "", account_type: "checking", balance: "", institution: "", is_primary: false, notes: "" });
    setEditAccount(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(account) {
    setForm({
      name: account.name,
      account_type: account.account_type,
      balance: account.balance?.toString() || "0",
      institution: account.institution || "",
      is_primary: account.is_primary || false,
      notes: account.notes || "",
    });
    setEditAccount(account);
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditAccount(null);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Account name is required."); return; }
    if (form.balance === "" || isNaN(parseFloat(form.balance))) { setError("Please enter a valid balance."); return; }

    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      account_type: form.account_type,
      balance: parseFloat(form.balance),
      institution: form.institution.trim() || null,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };

    let result;
    if (editAccount) {
      result = await supabase.from("mm_accounts").update(payload).eq("id", editAccount.id);
    } else {
      result = await supabase.from("mm_accounts").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      await fetchAccounts();
      closeModal();
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("mm_accounts").delete().eq("id", id);
    if (!error) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    }
  }

  const totalAssets = accounts
    .filter((a) => a.account_type !== "credit_card")
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalDebt = accounts
    .filter((a) => a.account_type === "credit_card")
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const netWorth = totalAssets - totalDebt;

  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    const list = accounts.filter((a) => a.account_type === type.value);
    if (list.length > 0) acc[type.value] = list;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>
            Accounts
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage your linked and manual accounts</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#E85D26" }}
        >
          <span className="text-lg leading-none">+</span>
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total Assets", value: formatCurrency(totalAssets), color: "text-green-400" },
          { label: "Total Debt", value: formatCurrency(totalDebt), color: "text-red-400" },
          { label: "Net Worth", value: formatCurrency(netWorth), color: netWorth >= 0 ? "text-green-400" : "text-red-400" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-4 border border-white/5"
            style={{ background: "#1a1a1a" }}
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg font-semibold ${card.color}`} style={{ fontFamily: "Sora, sans-serif" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div
            className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#E85D26] animate-spin"
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            Add your checking, savings, credit cards, and more to track your full financial picture.
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "#E85D26" }}
          >
            Add your first account
          </button>
        </div>
      )}

      {/* Accounts by Type */}
      {!loading && Object.entries(grouped).map(([type, list]) => {
        const typeInfo = getTypeInfo(type);
        const colors = TYPE_COLORS[type] || TYPE_COLORS.other;
        const groupTotal = list.reduce((s, a) => s + (a.balance || 0), 0);

        return (
          <div key={type} className="mb-6">
            {/* Group Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{typeInfo.icon}</span>
                <span className="text-sm font-medium text-gray-300">{typeInfo.label}</span>
              </div>
              <span className="text-sm text-gray-400">{formatCurrency(groupTotal)}</span>
            </div>

            {/* Account Cards */}
            <div className="space-y-2">
              {list.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl p-4 border border-white/5 flex items-center justify-between"
                  style={{ background: "#1a1a1a" }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colors.bg} border ${colors.border}`}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{account.name}</p>
                        {account.is_primary && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "#E85D26", color: "white", fontSize: "10px" }}
                          >
                            Primary
                          </span>
                        )}
                      </div>
                      {account.institution && (
                        <p className="text-xs text-gray-500 mt-0.5">{account.institution}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-semibold ${type === "credit_card" ? "text-red-400" : "text-white"}`}>
                      {formatCurrency(account.balance)}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(account)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        title="Edit"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(account)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 pb-8 border border-white/10"
            style={{ background: "#1a1a1a" }}
          >
            {/* Modal Handle */}
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "Sora, sans-serif" }}>
              {editAccount ? "Edit Account" : "Add Account"}
            </h2>

            <div className="space-y-4">
              {/* Account Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Chase Checking"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setForm({ ...form, account_type: type.value })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all ${
                        form.account_type === type.value
                          ? "border-[#E85D26] text-white"
                          : "border-white/5 text-gray-400 hover:border-white/20"
                      }`}
                      style={{ background: form.account_type === type.value ? "#E85D2615" : "#111" }}
                    >
                      <span className="text-base">{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {form.account_type === "credit_card" ? "Current Balance (what you owe)" : "Current Balance"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full bg-[#111] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Institution (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chase, Wells Fargo, Ally"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors"
                />
              </div>

              {/* Primary toggle */}
              <button
                onClick={() => setForm({ ...form, is_primary: !form.is_primary })}
                className="flex items-center gap-3 w-full"
              >
                <div
                  className={`w-10 h-6 rounded-full transition-all relative ${
                    form.is_primary ? "bg-[#E85D26]" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      form.is_primary ? "left-5" : "left-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-300">Mark as primary account</span>
              </button>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
                <textarea
                  placeholder="Any additional details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ background: "#E85D26" }}
                >
                  {saving ? "Saving..." : editAccount ? "Save Changes" : "Add Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 border border-white/10"
            style={{ background: "#1a1a1a" }}
          >
            <div className="text-3xl mb-3 text-center">🗑️</div>
            <h3 className="text-base font-semibold text-center mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Remove <span className="text-white font-medium">{deleteConfirm.name}</span>? This won't delete associated transactions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500/80 hover:bg-red-500 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
