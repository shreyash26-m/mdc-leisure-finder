// pages/api/members/index.js
// Replaces Flask /members GET route

import { requireAuth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export default async function handler(req, res) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const members = await prisma.member.findMany({
      orderBy: [{ domain: "asc" }, { name: "asc" }],
    });
    return res.status(200).json(members);
  }

  return res.status(405).end();
}
