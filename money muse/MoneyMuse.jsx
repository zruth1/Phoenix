import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import "../styles/MoneyMuse.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MoneyMuse() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "expense", amount: "", description: "", category: "", date: new Date().toISOString().split("T")[0],
  });

  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: txns }, { data: gs }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(20),
      supabase.from("savings_goals").select("*").eq("user_id", user.id),
    ]);
    if (txns) setTransactions(txns);
    if (gs) setGoals(gs);
  }

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const spent = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const left = income - spent;
  const pct = income > 0 ? Math.min(Math.round((spent / income) * 100), 100) : 0;

  const byCategory = transactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = catEntries[0]?.[1] || 1;

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: form.type,
      amount: Number(form.amount),
      description: form.description,
      category: form.category,
      date: form.date,
    });
    setLoading(false);
    setShowModal(false);
    setForm({ type: "expense", amount: "", description: "", category: "", date: new Date().toISOString().split("T")[0] });
    fetchAll();
  }

  return (
    <div className="mm-root">
      {/* Nav */}
      <nav className="mm-nav">
        <button className="mm-back" onClick={() => navigate("/dashboard")}>←</button>
        <span className="mm-nav-title">Money Muse</span>
      </nav>

      <div className="mm-main">

        {/* Overview */}
        <div className="mm-overview">
          <div className="mm-overview-row">
            <div className="mm-stat">
              <span className="mm-stat-label">Income</span>
              <span className="mm-stat-val green">${income.toLocaleString()}</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-label">Spent</span>
              <span className="mm-stat-val orange">${spent.toLocaleString()}</span>
            </div>
            <div className="mm-stat">
              <span className="mm-stat-label">Left</span>
              <span className="mm-stat-val">${left.toLocaleString()}</span>
            </div>
          </div>
          <div className="mm-bar">
            <div className="mm-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="mm-bar-meta">
            <span>{pct}% spent</span>
            <span>{monthLabel}</span>
          </div>
        </div>

        {/* Chart + Goals */}
        <div className="mm-grid">
          {/* Category chart */}
          <div className="mm-card">
            <div className="mm-card-title">By category</div>
            {catEntries.length === 0 ? (
              <p className="mm-empty">No expenses yet</p>
            ) : (
              <div className="mm-bars">
                {catEntries.map(([cat, amt]) => (
                  <div className="mm-bar-col" key={cat}>
                    <div className="mm-bar-col-fill" style={{ height: `${Math.round((amt / maxCat) * 100)}%` }} />
                    <span className="mm-bar-col-label">{cat.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings goals */}
          <div className="mm-card">
            <div className="mm-card-title">Savings goals</div>
            {goals.length === 0 ? (
              <p className="mm-empty">No goals yet</p>
            ) : (
              <div className="mm-goals">
                {goals.map(g => {
                  const gpct = Math.min(Math.round((g.saved / g.target) * 100), 100);
                  return (
                    <div className="mm-goal" key={g.id}>
                      <div className="mm-goal-row">
                        <span className="mm-goal-name">{g.name}</span>
                        <span className="mm-goal-amt">${g.saved}/${g.target}</span>
                      </div>
                      <div className="mm-goal-bar">
                        <div className="mm-goal-fill" style={{ width: `${gpct}%`, background: g.color || "#E85D26" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="mm-card">
          <div className="mm-card-title">Recent transactions</div>
          {transactions.length === 0 ? (
            <p className="mm-empty">No transactions yet — add one with the + button</p>
          ) : (
            <div className="mm-txns">
              {transactions.map(t => (
                <div className="mm-txn" key={t.id}>
                  <div className="mm-txn-icon">{t.type === "income" ? "💼" : categoryIcon(t.category)}</div>
                  <div className="mm-txn-info">
                    <div className="mm-txn-name">{t.description}</div>
                    <div className="mm-txn-cat">{t.category} · {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                  <span className={`mm-txn-amt ${t.type === "income" ? "pos" : "neg"}`}>
                    {t.type === "income" ? "+" : "-"}${Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FAB */}
      <button className="mm-fab" onClick={() => setShowModal(true)}>+</button>

      {/* Modal */}
      {showModal && (
        <div className="mm-modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="mm-modal">
            <div className="mm-modal-handle" />
            <div className="mm-modal-title">Add transaction</div>
            <form onSubmit={handleAdd}>
              <div className="mm-modal-row">
                <div className="mm-modal-field">
                  <label>Type</label>
                  <select value={form.type} onChange={set("type")}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="mm-modal-field">
                  <label>Amount</label>
                  <input type="number" placeholder="0.00" value={form.amount} onChange={set("amount")} required min="0" step="0.01" />
                </div>
              </div>
              <div className="mm-modal-field">
                <label>Description</label>
                <input type="text" placeholder="What was this for?" value={form.description} onChange={set("description")} required />
              </div>
              <div className="mm-modal-row">
                <div className="mm-modal-field">
                  <label>Category</label>
                  <input type="text" placeholder="e.g. Food" value={form.category} onChange={set("category")} required />
                </div>
                <div className="mm-modal-field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={set("date")} required />
                </div>
              </div>
              <button className="mm-modal-btn" type="submit" disabled={loading}>
                {loading ? "Adding…" : "Add transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function categoryIcon(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("eat") || c.includes("grocer")) return "🛒";
  if (c.includes("transport") || c.includes("car") || c.includes("uber")) return "🚗";
  if (c.includes("bill") || c.includes("util")) return "⚡";
  if (c.includes("shop") || c.includes("cloth")) return "🛍";
  if (c.includes("health") || c.includes("med")) return "💊";
  if (c.includes("coffee") || c.includes("cafe")) return "☕";
  return "💳";
}
