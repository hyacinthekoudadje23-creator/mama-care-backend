const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    phone TEXT PRIMARY KEY,
    name TEXT,
    lastPeriodDate TEXT NOT NULL,
    lang TEXT DEFAULT 'fr',
    channel TEXT DEFAULT 'app',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    message TEXT,
    dangerSigns TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (phone) REFERENCES patients(phone)
  );
`);

function createPatient({ phone, name, lastPeriodDate, lang = "fr", channel = "app" }) {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO patients (phone, name, lastPeriodDate, lang, channel, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name,
      lastPeriodDate = excluded.lastPeriodDate,
      lang = excluded.lang,
      channel = excluded.channel
  `);
  stmt.run(phone, name || null, lastPeriodDate, lang, channel, createdAt);
  return getPatient(phone);
}

function getPatient(phone) {
  const stmt = db.prepare("SELECT * FROM patients WHERE phone = ?");
  const row = stmt.get(phone);
  if (!row) return null;
  return { ...row, alerts: getAlertsForPatient(phone) };
}

function getAllPatients() {
  return db.prepare("SELECT * FROM patients").all();
}

function addAlert(phone, alert) {
  const timestamp = new Date().toISOString();
  db.prepare(`INSERT INTO alerts (phone, message, dangerSigns, timestamp) VALUES (?, ?, ?, ?)`)
    .run(phone, alert.message || null, JSON.stringify(alert.dangerSigns || []), timestamp);
  return getPatient(phone);
}

function getAlertsForPatient(phone) {
  return db.prepare("SELECT * FROM alerts WHERE phone = ? ORDER BY timestamp DESC")
    .all(phone).map((row) => ({ ...row, dangerSigns: JSON.parse(row.dangerSigns || "[]") }));
}

module.exports = { createPatient, getPatient, getAllPatients, addAlert };
