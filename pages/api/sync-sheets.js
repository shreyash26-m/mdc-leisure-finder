// pages/api/sync-sheets.js
// Reads members from Google Sheets CSV and syncs to DB
// OCR runs automatically for EVERY member that has a timetable_drive_link

import { requireAuth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { DOMAINS, defaultTimetable } from "../../lib/constants";
import { parseTimetableFromDriveLink } from "../../lib/ocrParser";

const SHEET_ID = "15GHxFi5_4T4gaH67j2oHA2iOEhKUHKo83gWDt_UpVfo";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&id=${SHEET_ID}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    const response = await fetch(SHEET_CSV_URL, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      return res.status(500).json({
        error: `Could not fetch Google Sheet. Make sure sharing is set to "Anyone with the link can view". HTTP ${response.status}`,
      });
    }

    const rows = parseCSV(await response.text());
    if (rows.length < 2) return res.status(400).json({ error: "Sheet is empty." });

    const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, "_"));
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));

    const results = { added: 0, updated: 0, ocrTriggered: 0, ocrFailed: 0, skipped: 0 };

    for (const rowArr of dataRows) {
      const row = {};
      headers.forEach((h, i) => { row[h] = (rowArr[i] || "").trim(); });

      const reg_no =
        row["reg_no"] || row["regno"] || row["registration_no"] || row["registration_number"] || "";
      if (!reg_no) { results.skipped++; continue; }

      const name     = row["name"] || row["full_name"] || "Unknown";
      const email    = row["email"] || "";
      const phone    = row["phone"] || row["phone_number"] || "";
      const domain   = row["domain"] || (DOMAINS[0] ?? "");
      const position = row["position"] || "Member";
      const timetable_drive_link =
        row["timetable_drive_link"] || row["timetable_link"] || row["drive_link"] || "";

      // Upsert member
      const existing = await prisma.member.findUnique({ where: { reg_no } });

      if (!existing) {
        await prisma.member.create({
          data: {
            reg_no, name, email, phone, domain, position,
            timetable_drive_link: timetable_drive_link || null,
            timetable_json: JSON.stringify(defaultTimetable()),
          },
        });
        results.added++;
      } else {
        await prisma.member.update({
          where: { reg_no },
          data: {
            name:     name || existing.name,
            email:    email || existing.email,
            phone:    phone || existing.phone,
            domain:   domain || existing.domain,
            position: position || existing.position,
            timetable_drive_link: timetable_drive_link || existing.timetable_drive_link,
          },
        });
        results.updated++;
      }

      // ── Always run OCR if there is a drive link ──────────────────────────
      const linkToUse = timetable_drive_link || existing?.timetable_drive_link || "";
      if (linkToUse) {
        try {
          console.log(`[sync] Running OCR for ${reg_no} — ${linkToUse}`);
          const tt = await parseTimetableFromDriveLink(linkToUse);

          // Check OCR actually found something (not all-Free)
          const occupiedCount = Object.values(tt).flatMap(Object.values)
            .filter((v) => v === "Occupied").length;
          console.log(`[sync] OCR result for ${reg_no}: ${occupiedCount} occupied slots`);

          await prisma.member.update({
            where: { reg_no },
            data: { timetable_json: JSON.stringify(tt) },
          });
          results.ocrTriggered++;
        } catch (e) {
          console.error(`[sync] OCR failed for ${reg_no}:`, e.message);
          results.ocrFailed++;
        }
      }
    }

    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error("[sync-sheets]", err);
    return res.status(500).json({ error: err.message });
  }
}

function parseCSV(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(cur); cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}