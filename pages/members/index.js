// pages/members/index.js
// Replaces members.html + Flask /members route
// Key change: "Open Excel" button replaced with file upload (browser-based)

import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { prisma } from "../../lib/prisma";
import Layout from "../../components/Layout";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const members = await prisma.member.findMany({
    orderBy: [{ domain: "asc" }, { name: "asc" }],
  });

  return {
    props: {
      members: members.map((m) => ({
        id: m.id, name: m.name, reg_no: m.reg_no, email: m.email,
        phone: m.phone, domain: m.domain, position: m.position,
      })),
    },
  };
}

export default function Members({ members }) {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  async function handleSheetsSync() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync-sheets", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncStatus({
          type: "success",
          message: `✓ Synced from Google Sheets — ${data.added} added, ${data.updated} updated, ${data.ocrTriggered} OCR runs.`,
        });
        router.replace(router.asPath);
      } else {
        setSyncStatus({ type: "error", message: data.error || "Sync failed." });
      }
    } catch {
      setSyncStatus({ type: "error", message: "Network error during sync." });
    }
    setSyncing(false);
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete ${name}?`)) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    router.replace(router.asPath);
  }

  return (
    <Layout title="Members - Leisure Finder Portal">

      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-sub">All registered team members.</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem" }}>
          <a href="https://docs.google.com/spreadsheets/d/15GHxFi5_4T4gaH67j2oHA2iOEhKUHKo83gWDt_UpVfo/edit?usp=sharing"
            target="_blank" rel="noreferrer" className="btn btn-outline">
            📊 Open Sheet
          </a>
          <a href="https://drive.google.com/drive/folders/1ptwgjydR3C6N-EO1Ja7pba4_FlXQm_qV?usp=drive_link"
            target="_blank" rel="noreferrer" className="btn btn-outline">
            🖼 Upload Timetables
          </a>
          <button className="btn btn-outline" onClick={handleSheetsSync} disabled={syncing}>
            {syncing ? "⏳ Syncing…" : "🔄 Sync from Sheets"}
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className={`flash flash-${syncStatus.type}`} style={{ marginBottom: "1rem" }}>
          {syncStatus.message}
        </div>
      )}

      {members.length > 0 ? (
        <div className="member-grid">
          {members.map((m) => (
            <div key={m.id} className="member-card glass-card">
              <div className="member-avatar">{m.name[0].toUpperCase()}</div>
              <div className="member-info">
                <h3 className="member-name">{m.name}</h3>
                <span className="member-reg">{m.reg_no}</span>
                <div className="member-tags">
                  <span className="tag tag-domain">{m.domain}</span>
                  <span className="tag tag-pos">{m.position}</span>
                </div>
                <div className="member-contacts">
                  <span>✉ {m.email}</span>
                  <span>📞 {m.phone}</span>
                </div>
              </div>
              <div className="member-actions">
                <Link href={`/members/${m.id}/edit`} className="btn btn-sm btn-primary">✎ Edit Details</Link>
                <Link href={`/members/${m.id}/timetable`} className="btn btn-sm btn-outline">Edit Timetable</Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id, m.name)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state glass-card">
          <div className="empty-icon">◈</div>
          <h3>No members yet</h3>
          <p>Add members to your <a href="https://docs.google.com/spreadsheets/d/15GHxFi5_4T4gaH67j2oHA2iOEhKUHKo83gWDt_UpVfo/edit?usp=sharing" target="_blank" rel="noreferrer" style={{color:"var(--purple)"}}>Google Sheet</a>, then click Sync.</p>
          <div style={{ display: "flex", gap: ".75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
            <button className="btn btn-primary" onClick={handleSheetsSync} disabled={syncing}>
              {syncing ? "⏳ Syncing…" : "🔄 Sync from Sheets"}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}