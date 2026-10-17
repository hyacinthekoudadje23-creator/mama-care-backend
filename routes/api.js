const express = require("express");
const router = express.Router();
const { calculatePregnancyStatus, getUpcomingVisits, getWeeklyTip, detectDangerSigns } = require("../lib/pregnancy");
const { createPatient, getPatient, addAlert } = require("../lib/store");

const SYSTEM_PROMPT = {
  fr: `Tu es Amina, une assistante de santé maternelle chaleureuse pour l'application Mama Care, destinée aux femmes enceintes en Afrique. Réponds en français. Sois empathique et pratique. Ne pose jamais de diagnostic médical. Si une femme décrit des signes de danger (saignement, douleur abdominale intense, maux de tête violents, vision trouble, absence de mouvements du bébé, fièvre élevée, gonflement soudain), oriente-la IMMÉDIATEMENT vers un centre de santé. Garde tes réponses courtes (3-5 phrases max).`,
  en: `You are Amina, a warm maternal health assistant for the Mama Care app, for pregnant women in Africa. Reply in English. Be empathetic and practical. Never give a medical diagnosis. If a woman describes danger signs (bleeding, severe abdominal pain, severe headache, blurred vision, reduced fetal movements, high fever, sudden swelling), direct her IMMEDIATELY to a health center. Keep responses short (3-5 sentences max).`
};

// POST /api/patients
router.post("/patients", (req, res) => {
  const { phone, name, lastPeriodDate, lang } = req.body;
  if (!phone || !lastPeriodDate) return res.status(400).json({ error: "phone et lastPeriodDate sont requis" });
  const patient = createPatient({ phone, name, lastPeriodDate, lang, channel: "app" });
  const status = calculatePregnancyStatus(lastPeriodDate);
  res.status(201).json({ patient, status });
});

// GET /api/patients/:phone/status
router.get("/patients/:phone/status", (req, res) => {
  const patient = getPatient(req.params.phone);
  if (!patient) return res.status(404).json({ error: "Patiente non trouvée" });
  const status = calculatePregnancyStatus(patient.lastPeriodDate);
  const upcomingVisits = getUpcomingVisits(status.currentWeek);
  const tip = getWeeklyTip(status.currentWeek, patient.lang);
  res.json({ patient, status, upcomingVisits, tip });
});

// POST /api/patients/:phone/check-symptoms
router.post("/patients/:phone/check-symptoms", (req, res) => {
  const { message } = req.body;
  const patient = getPatient(req.params.phone);
  if (!patient) return res.status(404).json({ error: "Patiente non trouvée" });
  if (!message) return res.status(400).json({ error: "message est requis" });
  const dangerSigns = detectDangerSigns(message);
  if (dangerSigns.length > 0) addAlert(req.params.phone, { message, dangerSigns: dangerSigns.map((s) => s.id) });
  res.json({
    dangerSignsDetected: dangerSigns.length > 0,
    dangerSigns,
    recommendation: dangerSigns.length > 0
      ? patient.lang === "en" ? "Please go to the nearest health center immediately." : "Rendez-vous immédiatement au centre de santé le plus proche."
      : patient.lang === "en" ? "No urgent signs detected." : "Aucun signe urgent détecté.",
  });
});

// POST /api/chat  ← route pour Amina
router.post("/chat", async (req, res) => {
  const { messages, lang } = req.body;
  if (!messages) return res.status(400).json({ error: "messages est requis" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT[lang || "fr"],
        messages
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur de connexion à l'API" });
  }
});

module.exports = router;
