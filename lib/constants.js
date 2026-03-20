// lib/constants.js
// Replaces models.py DOMAINS, DAYS, TIME_SLOTS, default_timetable()

export const DOMAINS = [
  "Data Verse",
  "Web Arc",
  "Competitive Programming",
  "Design",
  "Content",
  "Photography",
  "PR",
  "EB",
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const TIME_SLOTS = [
  "08:00-08:50",
  "09:00-09:50",
  "10:00-10:50",
  "11:00-11:50",
  "12:00-12:50",
  "13:00-13:50",
  "14:00-14:50",
  "15:00-15:50",
  "16:00-16:50",
];

export const EB_POSITIONS = [
  "President",
  "Vice-President",
  "Technical Head",
  "Creative Head",
  "Secretary",
  "Head of Operations",
];

export const DEFAULT_POSITIONS = ["Lead", "Member"];

export function defaultTimetable() {
  const tt = {};
  for (const day of DAYS) {
    tt[day] = {};
    for (const slot of TIME_SLOTS) {
      tt[day][slot] = "Free";
    }
  }
  return tt;
}
