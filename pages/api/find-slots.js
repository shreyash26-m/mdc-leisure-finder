// pages/api/find-slots.js
// Replaces Flask /api/find_slots POST route — exact same logic, pure JS

import { requireAuth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { DAYS, TIME_SLOTS } from "../../lib/constants";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await requireAuth(req, res);
  if (!session) return;

  const { group = "all", day = "Monday" } = req.body;

  if (!DAYS.includes(day)) {
    return res.status(400).json({ error: "Invalid day" });
  }

  // Fetch members
  const whereClause = group === "all" ? {} : { domain: group };
  const members = await prisma.member.findMany({ where: whereClause });

  if (!members.length) {
    return res.status(200).json({ case: "no_members", message: "No members found in this group." });
  }

  const total = members.length;

  // Build slot → free members map
  const slotFreeMembers = {};
  for (const slot of TIME_SLOTS) {
    const freeList = [];
    for (const m of members) {
      let tt = {};
      try { tt = JSON.parse(m.timetable_json || "{}"); } catch {}
      const status = tt?.[day]?.[slot] ?? "Free";
      if (status === "Free") {
        freeList.push({ id: m.id, name: m.name, domain: m.domain });
      }
    }
    slotFreeMembers[slot] = freeList;
  }

  // Case A: all members free
  const commonSlots = TIME_SLOTS.filter(
    (s) => slotFreeMembers[s].length === total
  );
  if (commonSlots.length > 0) {
    const slotDetails = {};
    commonSlots.forEach((s) => { slotDetails[s] = slotFreeMembers[s]; });
    return res.status(200).json({
      case: "A",
      total_members: total,
      common_slots: commonSlots,
      slot_details: slotDetails,
    });
  }

  // Case B: best partial slot
  const bestSlot = TIME_SLOTS.reduce((best, s) =>
    slotFreeMembers[s].length > slotFreeMembers[best].length ? s : best
  );
  const bestCount = slotFreeMembers[bestSlot].length;

  if (bestCount === 0) {
    return res.status(200).json({
      case: "none",
      message: "No members are free on this day.",
      total_members: total,
    });
  }

  const sortedSlots = [...TIME_SLOTS]
    .sort((a, b) => slotFreeMembers[b].length - slotFreeMembers[a].length)
    .filter((s) => slotFreeMembers[s].length > 0)
    .slice(0, 5)
    .map((s) => ({ slot: s, count: slotFreeMembers[s].length, members: slotFreeMembers[s] }));

  return res.status(200).json({
    case: "B",
    total_members: total,
    best_slot: bestSlot,
    best_count: bestCount,
    best_members: slotFreeMembers[bestSlot],
    top_slots: sortedSlots,
  });
}
