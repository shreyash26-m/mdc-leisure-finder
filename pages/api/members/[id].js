// pages/api/members/[id].js
// Replaces Flask edit_member, delete_member, save_timetable, member_timetable routes

import { requireAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { DOMAINS, EB_POSITIONS, DEFAULT_POSITIONS } from "../../../lib/constants";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const { id } = req.query;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return res.status(400).json({ error: "Invalid ID" });

  // ── GET — fetch single member ────────────────────────────────────────────
  if (req.method === "GET") {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: "Member not found" });
    return res.status(200).json(member);
  }

  // ── PUT — update member details ─────────────────────────────────────────
  if (req.method === "PUT") {
    const { name, reg_no, email, phone, domain, position } = req.body;

    if (!name || !reg_no || !email || !phone || !domain || !position) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!DOMAINS.includes(domain)) {
      return res.status(400).json({ error: "Invalid domain." });
    }
    const allowedPositions = domain === "EB" ? EB_POSITIONS : DEFAULT_POSITIONS;
    if (!allowedPositions.includes(position)) {
      return res.status(400).json({ error: `Invalid position for domain '${domain}'.` });
    }
    if (!/^[^@]+@(gitam\.in|student\.gitam\.edu)$/i.test(email)) {
      return res.status(400).json({ error: "Email must be @gitam.in or @student.gitam.edu" });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Phone must be exactly 10 digits." });
    }

    // Check reg_no uniqueness (exclude current member)
    const conflict = await prisma.member.findFirst({
      where: { reg_no, NOT: { id: memberId } },
    });
    if (conflict) {
      return res.status(400).json({ error: "Another member already has this registration number." });
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { name, reg_no, email, phone, domain, position },
    });
    return res.status(200).json(updated);
  }

  // ── DELETE — remove member ───────────────────────────────────────────────
  if (req.method === "DELETE") {
    await prisma.member.delete({ where: { id: memberId } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
