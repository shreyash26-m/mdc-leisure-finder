// lib/ocrParser.js
// Universal timetable OCR using Google Cloud Vision API
// Handles ANY timetable format — different slot ranges, dark/light headers,
// comma-separated courses, Saturday rows, etc.

import { DAYS, TIME_SLOTS, defaultTimetable } from "./constants";

export async function parseTimetableFromDriveLink(driveLink) {
  if (!driveLink) return defaultTimetable();
  try {
    const fileId = extractDriveFileId(driveLink);
    if (!fileId) { console.error("[OCR] Bad Drive link:", driveLink); return defaultTimetable(); }

    const base64Image = await downloadDriveImageAsBase64(fileId);
    if (!base64Image) { console.error("[OCR] Download failed:", fileId); return defaultTimetable(); }

    const words = await googleVisionWords(base64Image);
    if (!words.length) { console.error("[OCR] No words returned"); return defaultTimetable(); }

    return parseSpatially(words);
  } catch (err) {
    console.error("[OCR] Fatal:", err);
    return defaultTimetable();
  }
}

// ── Drive helpers ─────────────────────────────────────────────────────────────

function extractDriveFileId(link) {
  let m = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function downloadDriveImageAsBase64(fileId) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      console.error("[OCR] Drive returned HTML — file not shared publicly");
      return null;
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (err) {
    console.error("[OCR] Download error:", err.message);
    return null;
  }
}

// ── Google Vision — returns word list with bounding boxes ─────────────────────

async function googleVisionWords(base64Image) {
  const API_KEY = process.env.GOOGLE_VISION_API_KEY;
  if (!API_KEY) { console.error("[OCR] GOOGLE_VISION_API_KEY not set"); return []; }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
        }]
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!res.ok) { console.error("[OCR] Vision API error:", await res.text()); return []; }
  const data = await res.json();
  const words = [];

  for (const page of data.responses?.[0]?.fullTextAnnotation?.pages || []) {
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const word of para.words || []) {
          const text = word.symbols.map(s => s.text).join("");
          const verts = word.boundingBox?.vertices || [];
          const x  = verts[0]?.x ?? 0;
          const y  = verts[0]?.y ?? 0;
          const x2 = verts[2]?.x ?? 0;
          const y2 = verts[2]?.y ?? 0;
          words.push({
            text,
            cx: Math.round((x + x2) / 2),
            cy: Math.round((y + y2) / 2),
          });
        }
      }
    }
  }

  return words;
}

// ── Day aliases ───────────────────────────────────────────────────────────────

const DAY_MAP = {
  monday: "Monday",    mon: "Monday",
  tuesday: "Tuesday",  tue: "Tuesday",  tues: "Tuesday",
  wednesday: "Wednesday", wed: "Wednesday",
  thursday: "Thursday", thu: "Thursday", thur: "Thursday", thurs: "Thursday",
  friday: "Friday",    fri: "Friday",
  // Saturday / Sunday → skip
  saturday: "_SKIP",   sat: "_SKIP",
  sunday: "_SKIP",     sun: "_SKIP",
};

// ── Main spatial parser ───────────────────────────────────────────────────────

function parseSpatially(words) {
  const timetable = defaultTimetable();

  // ── Step 1: Detect header row Y by finding time words ────────────────────
  // Time words look like "07:00", "08:00", "08:50" etc.
  const timeWordRE = /^\d{1,2}:\d{2}$/;
  const allTimeWords = words.filter(w => timeWordRE.test(w.text));

  if (allTimeWords.length === 0) {
    console.error("[OCR] No time words found in image");
    return timetable;
  }

  // Group time words by Y row (within 15px = same row)
  const headerY = mostCommonY(allTimeWords, 15);
  const headerTimeWords = allTimeWords.filter(w => Math.abs(w.cy - headerY) < 20);

  console.log("[OCR] Header Y:", headerY, "| Time words on header:", headerTimeWords.map(w => w.text).join(", "));

  // ── Step 2: Build slot centers from start-of-hour words only ─────────────
  // "08:00", "09:00" etc — identify start times (min == 00 OR first of a pair)
  // Strategy: among header time words, find those at :00 minutes
  const startTimeWords = headerTimeWords.filter(w => {
    const min = parseInt(w.text.split(":")[1]);
    return min === 0;
  });

  // If no :00 words (unusual format), use all distinct hour positions
  const slotSourceWords = startTimeWords.length >= 2 ? startTimeWords : headerTimeWords;

  // Sort by X
  slotSourceWords.sort((a, b) => a.cx - b.cx);

  // Deduplicate by hour
  const seenHours = new Set();
  const uniqueSlotWords = slotSourceWords.filter(w => {
    const h = parseInt(w.text.split(":")[0]);
    if (seenHours.has(h)) return false;
    seenHours.add(h);
    return true;
  });

  // Map each start hour to the nearest TIME_SLOT in our system
  // e.g. image has 07:00 → not in our slots, skip
  //      image has 08:00 → maps to "08:00-08:50" ✅
  //      image has 10:00 → maps to "10:00-10:50" ✅
  const SLOT_BY_HOUR = {};
  for (const slot of TIME_SLOTS) {
    const h = parseInt(slot.split(":")[0]);
    SLOT_BY_HOUR[h] = slot;
  }

  // Build slot centers — only include slots that exist in our TIME_SLOTS
  const slotCenters = [];
  for (const w of uniqueSlotWords) {
    const h = parseInt(w.text.split(":")[0]);
    if (SLOT_BY_HOUR[h]) {
      slotCenters.push({ slot: SLOT_BY_HOUR[h], cx: w.cx });
    }
  }

  if (slotCenters.length === 0) {
    console.error("[OCR] No matching TIME_SLOTS found in image header");
    return timetable;
  }

  slotCenters.sort((a, b) => a.cx - b.cx);
  console.log("[OCR] Matched slots:", slotCenters.map(s => `${s.slot}@x${s.cx}`).join(", "));

  // Build X boundary ranges for each slot
  const slotBounds = slotCenters.map((sc, i) => {
    const prev = slotCenters[i - 1];
    const next = slotCenters[i + 1];
    const xLeft  = prev ? Math.round((prev.cx + sc.cx) / 2) : 0;
    const xRight = next ? Math.round((sc.cx + next.cx) / 2) : 99999;
    return { slot: sc.slot, xLeft, xRight };
  });

  // ── Step 3: Find day name words and build Y row boundaries ────────────────
  const dayWords = words.filter(w => {
    const key = w.text.toLowerCase();
    return DAY_MAP[key] !== undefined;
  });

  if (dayWords.length === 0) {
    console.error("[OCR] No day names found");
    return timetable;
  }

  // Deduplicate days (keep first occurrence by Y)
  const seenDays = new Set();
  const uniqueDayWords = dayWords
    .sort((a, b) => a.cy - b.cy)
    .filter(w => {
      const canonical = DAY_MAP[w.text.toLowerCase()];
      if (seenDays.has(canonical)) return false;
      seenDays.add(canonical);
      return true;
    });

  // Build Y row boundaries
  const rowBounds = uniqueDayWords.map((dw, i) => {
    const canonical = DAY_MAP[dw.text.toLowerCase()];
    const prev = uniqueDayWords[i - 1];
    const next = uniqueDayWords[i + 1];
    const yTop    = prev ? Math.round((prev.cy + dw.cy) / 2) : 0;
    const yBottom = next ? Math.round((dw.cy + next.cy) / 2) : 99999;
    return { day: canonical, yTop, yBottom };
  }).filter(r => r.day !== "_SKIP"); // Remove Saturday/Sunday

  console.log("[OCR] Day rows:", rowBounds.map(r => `${r.day}:y${r.yTop}-${r.yBottom}`).join(", "));

  // ── Step 4: Map every course word to (day, slot) using cx, cy ─────────────
  for (const word of words) {
    // Expand course tokens — handle comma-separated like "MATH1001,MATH1011"
    const tokens = word.text.split(",").map(t => t.trim());

    for (const token of tokens) {
      if (!isCourseCode(token)) continue;

      // Find day row
      const row = rowBounds.find(r => word.cy >= r.yTop && word.cy <= r.yBottom);
      if (!row || row.day === "_SKIP") continue;

      // Find slot column
      const col = slotBounds.find(s => word.cx >= s.xLeft && word.cx <= s.xRight);
      if (!col) continue;

      if (timetable[row.day] && timetable[row.day][col.slot] !== undefined) {
        timetable[row.day][col.slot] = "Occupied";
        console.log(`[OCR] ✓ ${row.day} ${col.slot} → Occupied (${token})`);
      }
    }
  }

  // Log summary
  for (const day of DAYS) {
    const count = Object.values(timetable[day]).filter(v => v === "Occupied").length;
    console.log(`[OCR] ${day}: ${count} occupied slots`);
  }

  return timetable;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Find the most common Y value among words (= header row Y)
function mostCommonY(words, tolerance = 15) {
  const groups = [];
  for (const w of words) {
    const g = groups.find(g => Math.abs(g.y - w.cy) < tolerance);
    if (g) { g.count++; g.y = Math.round((g.y + w.cy) / 2); }
    else groups.push({ y: w.cy, count: 1 });
  }
  groups.sort((a, b) => b.count - a.count);
  return groups[0]?.y ?? 0;
}

// Course code detector — handles all formats:
// CSEN3032, CSEN2031P, SOCY2121, MATH1001, EECE1001P, LANG1012, PHYS1001
function isCourseCode(text) {
  return /^[A-Z]{2,6}\d{3,6}[A-Z]?\d?P?$/i.test(text) && text.length >= 6;
}