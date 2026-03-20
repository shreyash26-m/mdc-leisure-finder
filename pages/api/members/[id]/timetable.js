// pages/api/members/[id]/timetable.js
// Replaces Flask save_timetable route

import { requireAuth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  const { id } = req.query;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return res.status(400).json({ error: "Invalid ID" });

  if (req.method === "POST") {
    const { timetable } = req.body;
    if (!timetable) return res.status(400).json({ error: "No timetable data received." });

    await prisma.member.update({
      where: { id: memberId },
      data: { timetable_json: JSON.stringify(timetable) },
    });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
