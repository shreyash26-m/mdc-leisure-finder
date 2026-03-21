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
                      <th style={thStyle}>Free Members</th>
                      <th style={{ ...thStyle, width:"110px", textAlign:"center" }}>Availability</th>
                      <th style={{ ...thStyle, width:"90px", textAlign:"center" }}>Status</th>
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
                          <td style={{ ...tdStyle, fontWeight:700, fontSize:"0.95rem",
                            color:"var(--purple,#334EAC)", whiteSpace:"nowrap" }}>
                            {row.slot}
                          </td>

                          {/* Member names */}
                          <td style={{ ...tdStyle, lineHeight:1.7 }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                              {(expanded[row.slot] ? row.members : row.members.slice(0, 3)).map((m) => (
                                <span key={m.id} style={{
                                  display:"inline-flex", alignItems:"center", gap:"5px",
                                  background:"rgba(112,150,209,0.12)",
                                  border:"1px solid rgba(112,150,209,0.25)",
                                  borderRadius:"20px", padding:"2px 10px",
                                  fontSize:"0.8rem", color:"var(--text,#081F5C)", fontWeight:500
                                }}>
                                  <span style={{ width:18, height:18, borderRadius:"50%",
                                    background:"var(--purple,#334EAC)", color:"#fff",
                                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                                    fontSize:"0.65rem", fontWeight:700, flexShrink:0 }}>
                                    {m.name[0].toUpperCase()}
                                  </span>
                                  {m.name}
                                </span>
                              ))}

                              {/* Show more / show less toggle */}
                              {row.members.length > 3 && !expanded[row.slot] && (
                                <button onClick={() => setExpanded(e => ({ ...e, [row.slot]: true }))}
                                  style={{ display:"inline-flex", alignItems:"center", gap:4,
                                    background:"rgba(51,78,172,0.1)", border:"1px dashed rgba(51,78,172,0.4)",
                                    borderRadius:"20px", padding:"2px 10px", fontSize:"0.78rem",
                                    color:"var(--purple,#334EAC)", fontWeight:600, cursor:"pointer" }}>
                                  ▼ {row.members.length - 3} more
                                </button>
                              )}
                              {row.members.length > 3 && expanded[row.slot] && (
                                <button onClick={() => setExpanded(e => ({ ...e, [row.slot]: false }))}
                                  style={{ display:"inline-flex", alignItems:"center", gap:4,
                                    background:"rgba(51,78,172,0.1)", border:"1px dashed rgba(51,78,172,0.4)",
                                    borderRadius:"20px", padding:"2px 10px", fontSize:"0.78rem",
                                    color:"var(--purple,#334EAC)", fontWeight:600, cursor:"pointer" }}>
                                  ▲ Show less
                                </button>
                              )}

                              {row.count < row.total && (
                                <span style={{ fontSize:"0.78rem", color:"var(--text-2,#7096d1)",
                                  alignSelf:"center", fontStyle:"italic" }}>
                                  +{row.total - row.count} busy
                                </span>
                              )}
                            </div>
                          </td>

                          {/* % bar */}
                          <td style={{ ...tdStyle, textAlign:"center" }}>
                            <div style={{ fontSize:"0.8rem", fontWeight:600,
                              color: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444",
                              marginBottom:4 }}>
                              {pct}%
                            </div>
                            <div style={{ height:6, borderRadius:3,
                              background:"rgba(112,150,209,0.15)", overflow:"hidden" }}>
                              <div style={{ height:"100%", borderRadius:3, width:`${pct}%`,
                                background: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444",
                                transition:"width 0.4s ease" }} />
                            </div>
                            <div style={{ fontSize:"0.72rem", color:"var(--text-2)", marginTop:3 }}>
                              {row.count}/{row.total} free
                            </div>
                          </td>

                          {/* Badge */}
                          <td style={{ ...tdStyle, textAlign:"center" }}>
                            {row.tag === "common" && (
                              <span style={badgeStyle("#10b981","rgba(16,185,129,0.12)")}>✓ All Free</span>
                            )}
                            {row.tag === "best" && (
                              <span style={badgeStyle("#f59e0b","rgba(245,158,11,0.12)")}>🏆 Best</span>
                            )}
                            {row.tag === "alt" && (
                              <span style={badgeStyle("#7096d1","rgba(112,150,209,0.12)")}>🔁 Alt</span>
                            )}
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