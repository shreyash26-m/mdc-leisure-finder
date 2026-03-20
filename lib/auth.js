// lib/auth.js
// Replaces Flask @login_required decorator

import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

/**
 * Use in any API route to require authentication.
 * Returns session if valid, sends 401 and returns null if not.
 */
export async function requireAuth(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return null;
  }
  return session;
}
