import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CATEGORIES = [
  { value: "housing", label: "Housing", icon: "🏠" },
  { value: "food", label: "Food & Dining", icon: "🍽️" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "health", label: "Health", icon: "💊" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "utilities", label: "Utilities", icon: "💡" },
  { value: "subscriptions", label: "Subscriptions", icon: "📱" },
  { value: "savings", label: "Savings", icon: "💰" },
  { value: "personal", label: "Personal Care", icon: "✨" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "other", label: "Other", icon: "📂" },
];

const RESET_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "payday", label: "Payday" },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getCategoryInfo(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[11];
}

function getProgressColor(pct) {
  if (pct >= 100) return "#ef4444";
  if (pct >= 80) return "#f97316";
  return "#E85D26";
}

function getProgressBg(pct) {
  if (pct >= 100) return "rgba(239,68,68,0.15)";
  if (pct >= 80) return "rgba(249,115,22,0.15)";
  return "rgba(232,93,38,0.12)";
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: "food",
    amount: "",
    reset_period: "monthly",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [budgetRes, txRes] = await Promise.all([
      supabase.from("mm_budgets").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("mm_transactions").select("category, amount, date").eq("user_id", user.id),
    ]);

    setBudgets(budgetRes.data || []);
    setTransactions(txRes.data || []);
    setLoading(false);
  }

  // Calculate spending for this month per category
  function getSpent(category) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter((t) => t.category === category && new Date(t.date) >= startOfMonth && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  function openAdd() {
    setForm({ category: "food", amount: "", reset_period: "monthly", notes: "" });
    setEditBudget(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(budget) {
    setForm({
      category: budget.category,
      amount: budget.amount?.toString() || "",
      reset_period: budget.reset_period || "monthly",
      notes: budget.notes || "",
    });
    setEditBudget(budget);
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditBudget(null);
    setError("");
  }

  async function handleSave() {
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      setError("Please enter a valid budget amount.");
      return;
    }
    const existing = budgets.find((b) => b.category === form.category && (!editBudget || b.id !== editBudget.id));
    if (existing) {
      setError("You already have a budget for this category.");
      return;
    }

    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      category: form.category,
      amount: parseFloat(form.amount),
      reset_period: form.reset_period,
      notes: form.notes.trim() || null,
    };

    let result;
    if (editBudget) {
      result = await supabase.from("mm_budgets").update(payload).eq("id", editBudget.id);
    } else {
      result = await supabase.from("mm_budgets").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      await fetchData();
      closeModal();
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    await supabase.from("mm_budgets").delete().eq("id", id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirm(null);
  }

  const totalBudgeted = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;

  const overBudget = budgets.filter((b) => getSpent(b.category) >= b.amount);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>
            Budgets
          </h1>
          <p className="text-sm text-gray-400 mt-1">Track spending by category</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#E85D26" }}
        >
          <span className="text-lg leading-none">+</span>
          Add Budget
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-2xl p-5 border border-white/5 mb-6" style={{ background: "#1a1a1a" }}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Budgeted", value: formatCurrency(totalBudgeted), color: "text-white" },
            { label: "Spent", value: formatCurrency(totalSpent), color: totalSpent > totalBudgeted ? "text-red-400" : "text-orange-400" },
            { label: "Remaining", value: formatCurrency(totalRemaining), color: totalRemaining < 0 ? "text-red-400" : "text-green-400" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-base font-semibold ${s.color}`} style={{ fontFamily: "Sora, sans-serif" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallPct}%`,
              background: getProgressColor(overallPct),
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{Math.round(overallPct)}% of total budget used</p>
      </div>

      {/* Over budget alert */}
      {overBudget.length > 0 && (
        <div className="rounded-2xl p-4 border border-red-500/20 mb-6 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)" }}>
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-300">Over budget</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              {overBudget.map((b) => getCategoryInfo(b.category).label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#E85D26] animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && budgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium mb-2">No budgets yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            Set spending limits by category to stay on track each month.
          </p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "#E85D26" }}
          >
            Create your first budget
          </button>
        </div>
      )}

      {/* Budget Cards */}
      {!loading && budgets.length > 0 && (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const cat = getCategoryInfo(budget.category);
            const spent = getSpent(budget.category);
            const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
            const remaining = budget.amount - spent;
            const isOver = spent >= budget.amount;
            const isWarning = pct >= 80 && !isOver;

            return (
              <div
                key={budget.id}
                className="rounded-2xl p-4 border border-white/5"
                style={{ background: "#1a1a1a" }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                      style={{ background: getProgressBg(pct) }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-gray-500">
                        Resets {RESET_OPTIONS.find((r) => r.value === budget.reset_period)?.label?.toLowerCase() || "monthly"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOver && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                        Over
                      </span>
                    )}
                    {isWarning && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                        Almost
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(budget)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(budget)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: getProgressColor(pct) }}
                  />
                </div>

                {/* Amounts row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    <span style={{ color: getProgressColor(pct) }}>{formatCurrency(spent)}</span>
                    <span className="text-gray-600"> / {formatCurrency(budget.amount)}</span>
                  </span>
                  <span className={`text-xs font-medium ${remaining < 0 ? "text-red-400" : "text-gray-400"}`}>
                    {remaining < 0 ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 pb-10 border border-white/10 overflow-y-auto"
            style={{ background: "#1a1a1a", maxHeight: "90vh" }}
          >
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "Sora, sans-serif" }}>
              {editBudget ? "Edit Budget" : "New Budget"}
            </h2>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setForm({ ...form, category: cat.value })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all ${
                        form.category === cat.value
                          ? "border-[#E85D26] text-white"
                          : "border-white/5 text-gray-400 hover:border-white/20"
                      }`}
                      style={{ background: form.category === cat.value ? "#E85D2615" : "#111" }}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-center leading-tight">{cat.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-[#111] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors"
                    step="1"
                  />
                </div>
              </div>

              {/* Reset Period */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Resets</label>
                <div className="grid grid-cols-4 gap-2">
                  {RESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, reset_period: opt.value })}
                      className={`py-2 rounded-xl border text-xs transition-all ${
                        form.reset_period === opt.value
                          ? "border-[#E85D26] text-white"
                          : "border-white/5 text-gray-400 hover:border-white/20"
                      }`}
                      style={{ background: form.reset_period === opt.value ? "#E85D2615" : "#111" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. includes groceries + takeout"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E85D26] transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

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
                  {saving ? "Saving..." : editBudget ? "Save Changes" : "Create Budget"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
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
            <h3 className="text-base font-semibold text-center mb-2">Delete Budget?</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Remove the <span className="text-white font-medium">{getCategoryInfo(deleteConfirm.category).label}</span> budget?
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
