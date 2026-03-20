// pages/members/[id]/edit.js
// Replaces edit_member.html + Flask edit_member route

import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import { DOMAINS, EB_POSITIONS, DEFAULT_POSITIONS } from "../../../lib/constants";
import Layout from "../../../components/Layout";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const member = await prisma.member.findUnique({ where: { id: parseInt(context.params.id) } });
  if (!member) return { notFound: true };

  return {
    props: {
      member: {
        id: member.id, name: member.name, reg_no: member.reg_no,
        email: member.email, phone: member.phone, domain: member.domain,
        position: member.position, timetable_drive_link: member.timetable_drive_link || "",
      },
    },
  };
}

export default function EditMember({ member }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...member });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    setPositions(form.domain === "EB" ? EB_POSITIONS : DEFAULT_POSITIONS);
  }, [form.domain]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!/^[^@]+@(gitam\.in|student\.gitam\.edu)$/i.test(form.email)) {
      return setError("Email must be @gitam.in or @student.gitam.edu");
    }
    if (!/^\d{10}$/.test(form.phone)) {
      return setError("Phone must be exactly 10 digits.");
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed."); setSaving(false); return; }
      router.push("/members");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Layout title={`Edit Member - ${member.name}`}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Member</h1>
          <p className="page-sub">Update details for <strong>{member.name}</strong></p>
        </div>
        <Link href="/members" className="btn btn-outline">← Back</Link>
      </div>

      <div className="form-card glass-card">
        {error && <div className="flash flash-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} className="member-form">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name <span className="req">*</span></label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Registration Number <span className="req">*</span></label>
              <input type="text" name="reg_no" value={form.reg_no} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email <span className="req">*</span></label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
              <small className="field-hint">@gitam.in or @student.gitam.edu only</small>
            </div>
            <div className="form-group">
              <label>Phone Number <span className="req">*</span></label>
              <input type="tel" name="phone" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                maxLength={10} required />
              <small className="field-hint">10 digits, no spaces</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Domain <span className="req">*</span></label>
              <select name="domain" value={form.domain} onChange={handleChange} required>
                <option value="" disabled>Select a domain</option>
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Position <span className="req">*</span></label>
              <select name="position" value={form.position} onChange={handleChange} required>
                <option value="" disabled>Select a position</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="timetable-info glass-card"
            style={{ padding: "14px 18px", marginBottom: "1.2rem", borderLeft: "3px solid var(--purple,#7c6cfa)" }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-2,#8fa4c8)" }}>
              🔗 <strong style={{ color: "var(--text-1,#e8edf8)" }}>Timetable</strong> is managed automatically via{" "}
              <code>members.xlsx</code> → <code>timetable_drive_link</code> column.
              {member.timetable_drive_link
                ? <><br /><span style={{ fontSize: "0.8rem" }}>Current link: <a href={member.timetable_drive_link}
                    target="_blank" rel="noreferrer" style={{ color: "var(--purple,#7c6cfa)" }}>
                    {member.timetable_drive_link.slice(0, 60)}…</a></span></>
                : <><br /><span style={{ fontSize: "0.8rem", color: "#f9a825" }}>
                    ⚠ No timetable Drive link set yet.</span></>}
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "✓ Save Changes"}
            </button>
            <Link href={`/members/${member.id}/timetable`} className="btn btn-outline">Edit Timetable Grid</Link>
            <Link href="/members" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
