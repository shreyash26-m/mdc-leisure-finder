// pages/dashboard.js
// Replaces dashboard.html + Flask /dashboard route

import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { prisma } from "../lib/prisma";
import { DOMAINS } from "../lib/constants";
import Layout from "../components/Layout";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef } from "react";

// Position rank — lower number = higher in list
const POSITION_RANK = {
  // EB positions
  "President": 1,
  "Vice-President": 2,
  "Technical Head": 3,
  "Creative Head": 4,
  "Secretary": 5,
  "Head of Operations": 6,
  // Domain positions
  "Lead": 1,
  "Member": 2,
};

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const allMembers = await prisma.member.findMany({ orderBy: [{ domain: "asc" }, { name: "asc" }] });
  const total = allMembers.length;

  const domainStats = {};
  const domainMembers = {};
  for (const domain of DOMAINS) {
    const inDomain = allMembers.filter((m) => m.domain === domain);
    domainStats[domain] = inDomain.length;
    // Sort by position rank, then alphabetically by name
    domainMembers[domain] = inDomain
      .map((m) => ({ name: m.name, position: m.position }))
      .sort((a, b) => {
        const rankA = POSITION_RANK[a.position] ?? 99;
        const rankB = POSITION_RANK[b.position] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }

  return {
    props: {
      total,
      domainStats,
      domainMembers,
      members: allMembers.map((m) => ({
        id: m.id, name: m.name, reg_no: m.reg_no,
        domain: m.domain, position: m.position,
        phone: m.phone, email: m.email,
      })),
    },
  };
}

export default function Dashboard({ total, domainStats, domainMembers, members }) {
  const panelRef = useRef(null);

  useEffect(() => {
    // Apply accent colours
    document.querySelectorAll("[data-accent-dot]").forEach((el) => {
      el.style.background = `var(--accent-${el.dataset.accentDot})`;
    });
    document.querySelectorAll("[data-accent-bar]").forEach((el) => {
      el.style.width = (el.dataset.width || 0) + "%";
      el.style.background = `var(--accent-${el.dataset.accentBar})`;
    });

    const panel = panelRef.current;
    if (!panel) return;
    const MARGIN = 12;

    document.querySelectorAll(".stat-card").forEach((card) => {
      const label = card.querySelector(".stat-label");
      if (!label) return;
      const domain = label.textContent.trim();
      const mems = domainMembers[domain] || [];

      card.addEventListener("mouseenter", () => {
        let html = `<div style="font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7096d1;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.12)">${domain}</div>`;
        if (mems.length) {
          mems.forEach((m) => {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:.85rem;color:#ffffff;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</span>
              <span style="font-size:.68rem;font-weight:600;color:#a0c4ff;background:rgba(112,150,209,0.2);border:1px solid rgba(112,150,209,0.35);border-radius:20px;padding:2px 8px;white-space:nowrap;flex-shrink:0">${m.position}</span>
            </div>`;
          });
        } else {
          html += `<div style="font-size:.82rem;color:#7096d1;font-style:italic">No members yet</div>`;
        }

        // Inject content first, then measure, then position
        panel.innerHTML = html;
        panel.style.visibility = "hidden";
        panel.style.display = "block";

        // Use requestAnimationFrame to ensure DOM has rendered before measuring
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const pw = panel.offsetWidth || 240;
          const ph = panel.offsetHeight || 120;
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          let left = rect.right + MARGIN;
          let top = rect.top + window.scrollY;

          // Flip left if no room on right
          if (rect.right + pw + MARGIN > vw) left = rect.left - pw - MARGIN + window.scrollX;
          if (left < MARGIN) left = MARGIN;

          // Clamp vertically
          const topViewport = rect.top;
          let topFixed = topViewport;
          if (topFixed + ph > vh - MARGIN) topFixed = vh - ph - MARGIN;
          if (topFixed < MARGIN) topFixed = MARGIN;

          panel.style.left = left + "px";
          panel.style.top = topFixed + "px";
          panel.style.visibility = "visible";
          panel.classList.add("visible");
        });
      });

      card.addEventListener("mouseleave", () => {
        panel.classList.remove("visible");
        panel.style.display = "none";
      });
    });
  }, [domainMembers]);

  return (
    <Layout title="Dashboard - Leisure Finder Portal">

      <div className="page-header dash-header">
        <div className="dash-header-left">
          <img src="/mdc_logo.svg" alt="MDC Logo" className="dash-logo" />
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Overview of your team across all domains.</p>
          </div>
          <div className="total-members-pill">
            <span className="total-members-count">{total}</span>
            <span className="total-members-label">Total Members</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {DOMAINS.map((domain, idx) => {
          const count = domainStats[domain] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={domain} className="stat-card glass-card" style={{ position: "relative" }} data-accent={idx + 1}>
              <div className="stat-dot" data-accent-dot={idx + 1}></div>
              <div className="stat-value">{count}</div>
              <div className="stat-label">{domain}</div>
              <div className="stat-bar-wrap">
                <div className="stat-bar" data-accent-bar={idx + 1} data-width={pct}></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="quick-actions">
        <a href="https://drive.google.com/drive/folders/1ptwgjydR3C6N-EO1Ja7pba4_FlXQm_qV?usp=drive_link"
          target="_blank" rel="noreferrer" className="btn btn-outline">🖼 Upload Timetables</a>
        <a href="https://docs.google.com/spreadsheets/d/15GHxFi5_4T4gaH67j2oHA2iOEhKUHKo83gWDt_UpVfo/edit?usp=sharing"
          target="_blank" rel="noreferrer" className="btn btn-outline">📂 Manage Members</a>
        <Link href="/finder" className="btn btn-outline">◈ Find Leisure Slot</Link>
      </div>

      <div className="dash-members-section">
        <h2 className="dash-section-title">Registered Members</h2>
        {members.length > 0 ? (
          <div className="dash-table-wrap glass-card">
            <table className="dash-table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Domain</th><th>Phone</th><th>Email</th><th></th></tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id}>
                    <td className="dash-idx">{i + 1}</td>
                    <td>
                      <div className="dash-member-name">{m.name}</div>
                      <div className="dash-member-reg">{m.reg_no}</div>
                    </td>
                    <td><span className="tag tag-domain">{m.domain}</span></td>
                    <td className="dash-contact">{m.phone}</td>
                    <td className="dash-contact">{m.email}</td>
                    <td><Link href={`/members/${m.id}/edit`} className="btn btn-sm btn-outline">✎</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: "28px", textAlign: "center", color: "var(--text-2)" }}>
            No members registered yet.
          </div>
        )}
      </div>

      {/* Floating domain panel */}
      <div id="domainPanel" ref={panelRef} style={{ position: "fixed", zIndex: 9999, minWidth: 210, maxWidth: 270,
        background: "#1a2340", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12,
        padding: "14px 16px", boxShadow: "0 10px 32px rgba(0,0,0,0.6)", pointerEvents: "none",
        color: "#ffffff",
        opacity: 0, transform: "scale(0.95)", transition: "opacity 0.15s ease, transform 0.15s ease", display: "none" }}>
      </div>

      <style jsx>{`
        #domainPanel.visible { opacity: 1 !important; transform: scale(1) !important; }
        .dp-title {
          font-size: .65rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #7096d1;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,.12);
        }
        .dp-row {
          display: flex; justify-content: space-between;
          align-items: center; gap: 10px; padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dp-row:last-child { border-bottom: none; }
        .dp-name {
          font-size: .85rem; color: #ffffff; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dp-badge {
          font-size: .68rem; font-weight: 600;
          color: #334EAC; background: rgba(112,150,209,0.18);
          border: 1px solid rgba(112,150,209,0.35);
          border-radius: 20px; padding: 2px 8px;
          white-space: nowrap; flex-shrink: 0;
        }
        .dp-empty { font-size: .82rem; color: #7096d1; font-style: italic; }
      `}</style>
    </Layout>
  );
}