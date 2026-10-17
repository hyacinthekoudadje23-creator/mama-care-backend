const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PREGNANCY_DURATION_DAYS = 280;

function calculatePregnancyStatus(lastPeriodDateISO, today = new Date()) {
  const lastPeriodDate = new Date(lastPeriodDateISO);
  const dueDate = new Date(lastPeriodDate.getTime() + PREGNANCY_DURATION_DAYS * MS_PER_DAY);
  const daysSinceLastPeriod = Math.floor((today - lastPeriodDate) / MS_PER_DAY);
  const currentWeek = Math.floor(daysSinceLastPeriod / 7);
  const daysIntoWeek = daysSinceLastPeriod % 7;
  let trimester = 1;
  if (currentWeek >= 27) trimester = 3;
  else if (currentWeek >= 13) trimester = 2;
  return {
    currentWeek: Math.max(0, currentWeek),
    daysIntoWeek,
    trimester,
    dueDate: dueDate.toISOString().split("T")[0],
    daysSinceLastPeriod,
  };
}

const RECOMMENDED_ANC_VISITS_WEEKS = [12, 16, 20, 26, 30, 34, 36, 38];

function getUpcomingVisits(currentWeek) {
  return RECOMMENDED_ANC_VISITS_WEEKS
    .filter((week) => week >= currentWeek)
    .map((week) => ({
      visitNumber: RECOMMENDED_ANC_VISITS_WEEKS.indexOf(week) + 1,
      weekScheduled: week,
      weeksFromNow: week - currentWeek,
    }));
}

const DANGER_SIGNS = [
  { id: "bleeding", fr: "saignement vaginal", en: "vaginal bleeding", keywords: ["saign", "sang", "bleed", "blood"], urgency: "critical" },
  { id: "severe_headache", fr: "maux de tête violents", en: "severe headache", keywords: ["tete", "tête", "vision", "headache", "vue"], urgency: "critical" },
  { id: "fever", fr: "fièvre élevée", en: "high fever", keywords: ["fievre", "fièvre", "chaud", "fever"], urgency: "high" },
  { id: "severe_abdominal_pain", fr: "douleur abdominale intense", en: "severe abdominal pain", keywords: ["ventre", "douleur", "abdomen", "pain", "stomach"], urgency: "critical" },
  { id: "reduced_fetal_movement", fr: "diminution des mouvements du bébé", en: "reduced baby movement", keywords: ["bouge", "mouvement", "move", "kick"], urgency: "high" },
  { id: "swelling", fr: "gonflement soudain", en: "sudden swelling", keywords: ["gonfle", "enfle", "swell", "visage", "face"], urgency: "high" },
];

function detectDangerSigns(message) {
  const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return DANGER_SIGNS.filter((sign) =>
    sign.keywords.some((keyword) => normalized.includes(keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
  );
}

function getWeeklyTip(currentWeek, lang = "fr") {
  const tips = {
    fr: {
      early: "Pensez à prendre vos comprimés de fer et d'acide folique tous les jours.",
      mid: "C'est le bon moment pour planifier votre prochaine visite prénatale.",
      late: "Préparez votre sac pour l'accouchement et identifiez le centre de santé le plus proche.",
    },
    en: {
      early: "Remember to take your iron and folic acid tablets every day.",
      mid: "Now is a good time to plan your next antenatal visit.",
      late: "Pack your delivery bag and identify your nearest health center.",
    },
  };
  const set = tips[lang] || tips.fr;
  if (currentWeek < 13) return set.early;
  if (currentWeek < 27) return set.mid;
  return set.late;
}

module.exports = { calculatePregnancyStatus, getUpcomingVisits, detectDangerSigns, getWeeklyTip, DANGER_SIGNS, RECOMMENDED_ANC_VISITS_WEEKS };
