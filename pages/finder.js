// pages/finder.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { DOMAINS, DAYS } from "../lib/constants";
import Layout from "../components/Layout";
import { useState } from "react";

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}

export default function Finder() {
  const [group, setGroup] = useState("all");
  const [day, setDay]   = useState("Monday");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [expanded, setExpanded] = useState({}); // {slot: true/false}

  async function findSlots() {
    setLoading(true);
    setResult(null);
    setExpanded({});
    try {
      const res = await fetch("/api/find-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, day }),
      });
      setResult(await res.json());
    } catch {
      setResult({ case: "none", message: "Network error. Please try again." });
    }
    setLoading(false);
  }

  const groupLabel = group === "all" ? "Entire Team" : group;

  // Build rows for the results table
  function buildTableRows() {
    if (!result) return [];
    if (result.case === "A") {
      return result.common_slots.map((slot) => ({
        slot,
        members: result.slot_details[slot],
        count: result.slot_details[slot].length,
        total: result.total_members,
        tag: "common",
      }));
    }
    if (result.case === "B") {
      return result.top_slots.map((item, i) => ({
        slot: item.slot,
        members: item.members,
        count: item.count,
        total: result.total_members,
        tag: i === 0 ? "best" : "alt",
      }));
    }
    return [];
  }

  const rows = buildTableRows();

  return (
    <Layout title="Leisure Finder Portal">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leisure Finder</h1>
          <p className="page-sub">Find the best common free slot for your team.</p>
        </div>
      </div>

      <div className="finder-layout">
        {/* ── Left panel ── */}
        <div className="finder-panel glass-card">
          <h2 className="panel-title">Select Group &amp; Day</h2>
          <div className="form-group">
            <label>Team / Domain</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">🌐 Entire Team</option>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Day of Week</label>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={findSlots} disabled={loading}>
            {loading ? "Analyzing…" : "◈ Find Common Slot"}
          </button>
        </div>

        {/* ── Right results panel ── */}
        <div className="results-panel">

          {/* Placeholder */}
          {!loading && !result && (
            <div className="results-placeholder glass-card">
              <div className="placeholder-icon">◈</div>
              <p>Select a group and day, then click <strong>Find Common Slot</strong>.</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-state glass-card" style={{ display:"flex" }}>
              <div className="spinner"></div>
              <p>Analyzing schedules…</p>
            </div>
          )}

          {/* No members / no slots */}
          {(result?.case === "none" || result?.case === "no_members") && (
            <div className="result-banner error glass-card">
              <div className="result-banner-icon">✕</div>
              <div>
                <div className="result-label">{result.message || "No common leisure period found."}</div>
              </div>
            </div>
          )}

          {/* ── Results table ── */}
          {rows.length > 0 && (
            <>
              {/* Banner */}
              <div className={`result-banner ${result.case === "A" ? "success" : "warning"} glass-card`}
                style={{ marginBottom: "1.2rem" }}>
                <div className="result-banner-icon">{result.case === "A" ? "✓" : "◈"}</div>
                <div>
                  <div className="result-label">
                    {result.case === "A" ? "Common Free Time Found!" : "No full common slot — Best available:"}
                  </div>
                  <div className="result-sub">
                    {groupLabel} — {day} — {result.total_members} members
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="glass-card" style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid var(--border,rgba(112,150,209,0.3))" }}>
                      <th style={thStyle}>Time Slot</th>
                      <th style={{ ...thStyle, textAlign:"center" }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const pct = Math.round((row.count / row.total) * 100);
                      return (
                        <tr key={row.slot}
                          style={{ borderBottom:"1px solid var(--border,rgba(112,150,209,0.15))",
                            background: idx % 2 === 0 ? "rgba(112,150,209,0.04)" : "transparent" }}>

                          {/* Slot time */}
                          <td style={{ ...tdStyle, fontWeight:700, fontSize:"1rem",
                            color:"var(--purple,#334EAC)", whiteSpace:"nowrap" }}>
                            {row.slot}
                          </td>

                          {/* Availability — just the count */}
                          <td style={{ ...tdStyle, textAlign:"center" }}>
                            <div style={{ fontSize:"1.6rem", fontWeight:700,
                              color: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }}>
                              {row.count}
                            </div>
                            <div style={{ fontSize:"0.75rem", color:"var(--text-2,#7096d1)", marginTop:2 }}>
                              of {row.total} free
                            </div>
                            <div style={{ height:6, borderRadius:3, margin:"6px auto 0",
                              maxWidth:80, background:"rgba(112,150,209,0.15)", overflow:"hidden" }}>
                              <div style={{ height:"100%", borderRadius:3, width:`${pct}%`,
                                background: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444",
                                transition:"width 0.4s ease" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-2,#7096d1)",
};

const tdStyle = {
  padding: "12px 16px",
  verticalAlign: "middle",
  fontSize: "0.875rem",
  color: "var(--text,#081F5C)",
};

function badgeStyle(color, bg) {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "0.72rem",
    fontWeight: 700,
    color,
    background: bg,
    border: `1px solid ${color}40`,
    whiteSpace: "nowrap",
  };
}