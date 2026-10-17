const express = require("express");
const router = express.Router();
const { calculatePregnancyStatus, getWeeklyTip, detectDangerSigns } = require("../lib/pregnancy");
const { createPatient, getPatient, addAlert } = require("../lib/store");

router.post("/sms/incoming", async (req, res) => {
  const { from, text } = req.body;
  if (!from || !text) return res.status(400).json({ error: "from et text sont requis" });

  const trimmed = text.trim();
  const upper = trimmed.toUpperCase();
  let replyMessage = "";

  if (upper.startsWith("INSCRIRE") || upper.startsWith("REGISTER")) {
    const lang = upper.startsWith("REGISTER") ? "en" : "fr";
    const datePart = trimmed.split(" ")[1];
    const isoDate = parseFlexibleDate(datePart);
    if (!isoDate) {
      replyMessage = lang === "en" ? "Format: REGISTER DD/MM/YYYY" : "Format : INSCRIRE JJ/MM/AAAA";
    } else {
      createPatient({ phone: from, lastPeriodDate: isoDate, lang, channel: "sms" });
      const status = calculatePregnancyStatus(isoDate);
      replyMessage = lang === "en"
        ? `Registered! Week ${status.currentWeek}. Due date: ${status.dueDate}. Reply STATUS anytime.`
        : `Inscrite ! Semaine ${status.currentWeek}. Date prévue : ${status.dueDate}. Répondez STATUT.`;
    }
  } else if (upper === "STATUT" || upper === "STATUS") {
    const patient = getPatient(from);
    if (!patient) {
      replyMessage = "Envoyez INSCRIRE JJ/MM/AAAA / Send REGISTER DD/MM/YYYY";
    } else {
      const status = calculatePregnancyStatus(patient.lastPeriodDate);
      const tip = getWeeklyTip(status.currentWeek, patient.lang);
      replyMessage = patient.lang === "en"
        ? `Week ${status.currentWeek}. Tip: ${tip}`
        : `Semaine ${status.currentWeek}. Conseil : ${tip}`;
    }
  } else {
    const patient = getPatient(from);
    const dangerSigns = detectDangerSigns(trimmed);
    const lang = patient?.lang || "fr";
    if (dangerSigns.length > 0) {
      if (patient) addAlert(from, { message: trimmed, dangerSigns: dangerSigns.map((s) => s.id) });
      replyMessage = lang === "en"
        ? "⚠️ This may be urgent. Go to the nearest health center now."
        : "⚠️ Ceci peut être urgent. Rendez-vous au centre de santé le plus proche.";
    } else {
      replyMessage = lang === "en"
        ? "Message received. Reply STATUS for your update."
        : "Message reçu. Répondez STATUT pour votre suivi.";
    }
  }
  res.json({ to: from, reply: replyMessage });
});

function parseFlexibleDate(datePart) {
  if (!datePart) return null;
  const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

module.exports = router;
