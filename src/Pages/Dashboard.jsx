import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

 useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user || { user_metadata: { full_name: "Zoie" } });
  });
}, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const name = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="dash-root">
      {/* Top Nav */}
      <nav className="dash-nav">
        <span className="dash-nav-logo">Phoenix<span className="dot">.</span></span>
        <div className="dash-nav-right">
          <div className="dash-avatar" onClick={handleSignOut} title="Sign out">
            {name[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="dash-main">

        {/* Greeting */}
        <div className="dash-greeting">
          <h1>{greeting}, {name} ✦</h1>
          <p className="dash-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>

        {/* Card Grid */}
        <div className="dash-grid">

          {/* Money Muse */}
          <div className="dash-card dash-card--money">
            <div className="dash-card-header">
              <span className="dash-card-icon">💰</span>
              <span className="dash-card-label">Money Muse</span>
            </div>
            <div className="dash-card-stat">$1,240</div>
            <div className="dash-card-sub">left this month</div>
            <div className="dash-progress-bar">
              <div className="dash-progress-fill" style={{ width: "62%" }} />
            </div>
            <div className="dash-card-meta">62% of budget used</div>
            <button className="dash-card-btn" onClick={() => navigate("/money-muse")}>View budget →</button>
          </div>

          {/* Plate */}
          <div className="dash-card dash-card--plate">
            <div className="dash-card-header">
              <span className="dash-card-icon">🍽</span>
              <span className="dash-card-label">Plate</span>
            </div>
            <div className="dash-meals">
              <div className="dash-meal">
                <span className="dash-meal-time">Lunch</span>
                <span className="dash-meal-name">Grilled salmon bowl</span>
              </div>
              <div className="dash-meal">
                <span className="dash-meal-time">Dinner</span>
                <span className="dash-meal-name">Turkey stir fry</span>
              </div>
            </div>
            <button className="dash-card-btn" onClick={() => navigate("/plate")}>View meal plan →</button>
          </div>

          {/* Quick Actions */}
          <div className="dash-card dash-card--actions">
            <div className="dash-card-header">
              <span className="dash-card-icon">⚡</span>
              <span className="dash-card-label">Quick actions</span>
            </div>
            <div className="dash-actions-grid">
              <button className="dash-action-btn" onClick={() => navigate("/money-muse/add")}>+ Expense</button>
              <button className="dash-action-btn" onClick={() => navigate("/plate/log")}>+ Meal</button>
              <button className="dash-action-btn" onClick={() => navigate("/tasks/add")}>+ Task</button>
              <button className="dash-action-btn" onClick={() => navigate("/notes/add")}>+ Note</button>
            </div>
          </div>

          {/* Tasks */}
          <div className="dash-card dash-card--tasks">
            <div className="dash-card-header">
              <span className="dash-card-icon">✓</span>
              <span className="dash-card-label">Upcoming</span>
            </div>
            <div className="dash-tasks">
              <TaskItem label="Review LSAT practice set" due="Today" />
              <TaskItem label="Push Phoenix to GitHub" due="Today" />
              <TaskItem label="Submit Amber Grant application" due="Apr 3" />
              <TaskItem label="Tesla financing — Navy Federal" due="May" />
            </div>
            <button className="dash-card-btn" onClick={() => navigate("/tasks")}>View all →</button>
          </div>

        </div>
      </main>
    </div>
  );
}

function TaskItem({ label, due }) {
  const [done, setDone] = useState(false);
  return (
    <div className={`dash-task ${done ? "done" : ""}`}>
      <button className="dash-task-check" onClick={() => setDone((v) => !v)}>
        {done ? "✓" : ""}
      </button>
      <span className="dash-task-label">{label}</span>
      <span className="dash-task-due">{due}</span>
    </div>
  );
}
