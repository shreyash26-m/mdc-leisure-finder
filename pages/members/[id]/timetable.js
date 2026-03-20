// pages/members/[id]/timetable.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import { DAYS, TIME_SLOTS, defaultTimetable } from "../../../lib/constants";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const member = await prisma.member.findUnique({ where: { id: parseInt(context.params.id) } });
  if (!member) return { notFound: true };

  let timetable = defaultTimetable();
  try { if (member.timetable_json) timetable = JSON.parse(member.timetable_json); } catch {}

  return {
    props: {
      member: {
        id: member.id, name: member.name,
        reg_no: member.reg_no, domain: member.domain,
        timetable_drive_link: member.timetable_drive_link || "",
      },
      initialTimetable: timetable,
    },
  };
}

export default function EditTimetable({ member, initialTimetable }) {
  const router = useRouter();
  const [timetable, setTimetable] = useState(initialTimetable);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  function toggleCell(day, slot) {
    setTimetable((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: prev[day][slot] === "Free" ? "Occupied" : "Free" },
    }));
  }

  function markAll(status) {
    const tt = defaultTimetable();
    if (status === "Occupied") DAYS.forEach((d) => TIME_SLOTS.forEach((s) => (tt[d][s] = "Occupied")));
    setTimetable(tt);
  }

  async function saveTimetable() {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/members/${member.id}/timetable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timetable }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/members");
      } else {
        setStatusMsg({ type: "error", message: data.error || "Save failed." });
        setSaving(false);
      }
    } catch {
      setStatusMsg({ type: "error", message: "Network error." });
      setSaving(false);
    }
  }

  return (
    <Layout title={`Timetable - ${member.name}`}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Editor</h1>
          <p className="page-sub">
            <span className="tag tag-domain">{member.domain}</span>{" "}
            <strong>{member.name}</strong> — {member.reg_no}
          </p>
        </div>
        <Link href="/members" className="btn btn-ghost">← Members</Link>
      </div>

      {/* Drive link info */}
      {member.timetable_drive_link ? (
        <div className="glass-card" style={{ padding:"12px 18px", marginBottom:"1rem",
          borderLeft:"3px solid var(--purple,#334EAC)", fontSize:"0.85rem" }}>
          📎 Timetable auto-loaded from Drive.{" "}
          <a href={member.timetable_drive_link} target="_blank" rel="noreferrer"
            style={{ color:"var(--purple)" }}>View image</a>
          {" — "}To update, change the link in Google Sheets and click <strong>🔄 Sync from Sheets</strong>.
        </div>
      ) : (
        <div className="glass-card" style={{ padding:"12px 18px", marginBottom:"1rem",
          borderLeft:"3px solid #f59e0b", fontSize:"0.85rem", color:"var(--text-2)" }}>
          ⚠ No Drive link set. Add <code>timetable_drive_link</code> in Google Sheets and sync to auto-load timetable.
        </div>
      )}

      {statusMsg && (
        <div className={`flash flash-${statusMsg.type}`} style={{ marginBottom:"1rem" }}>
          {statusMsg.message}
        </div>
      )}

      <div className="tt-legend glass-card">
        <div className="legend-wrap">
          <div className="legend-item"><span className="legend-dot free"></span> Free — Click to mark Occupied</div>
          <div className="legend-item"><span className="legend-dot busy"></span> Occupied — Click to mark Free</div>
        </div>
        <div className="legend-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => markAll("Free")}>All Free</button>
          <button className="btn btn-sm btn-ghost" onClick={() => markAll("Occupied")}>All Occupied</button>
          <button className="btn btn-primary" onClick={saveTimetable} disabled={saving}>
            {saving ? "Saving…" : "✓ Save Timetable"}
          </button>
        </div>
      </div>

      <div className="tt-scroll-wrap">
        <div className="tt-grid-container glass-card">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="slot-header">Time Slot</th>
                {DAYS.map((d) => <th key={d}>{d.slice(0,3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="slot-label">{slot}</td>
                  {DAYS.map((day) => {
                    const status = timetable?.[day]?.[slot] ?? "Free";
                    return (
                      <td key={day}
                        className={`tt-cell ${status === "Free" ? "free" : "busy"}`}
                        onClick={() => toggleCell(day, slot)}
                        style={{ cursor:"pointer" }}>
                        <span className="cell-label">{status === "Free" ? "Free" : "Occupied"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}