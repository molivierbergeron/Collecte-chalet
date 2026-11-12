// Ordures — maison (Villeray, Montréal)
// Script pour l'app Scriptable (iPhone).
//
// Widget : allumé du vendredi jusqu'au jeudi midi la semaine où les ordures passent,
//          éteint l'autre semaine.
// Rappel : notification la veille de la collecte à 19 h (mercredi soir).
// Aucune connexion Internet : le téléphone calcule la semaine lui-même.

// ===== Réglages =====
const PREMIERE_COLLECTE = [2026, 11, 19] // jeudi 19 novembre 2026 (année, mois, jour)
const INTERVALLE_JOURS = 14              // une semaine sur deux
const DEBUT_SIGNAL_JOURS_AVANT = 6       // allumé dès le vendredi (6 jours avant le jeudi)
const FIN_SIGNAL_HEURE = 12              // éteint le jour de la collecte, à midi
const RAPPEL_HEURE = 19                  // rappel la veille, à 19 h
const RAPPELS_A_PLANIFIER = 26           // environ un an d'avance

// Collectes déplacées ou annulées par la Ville (Fêtes, etc.).
// "date normale": "nouvelle date"   ou   "date normale": null   pour annuler.
const DEPLACEMENTS = {
  // "2026-12-31": "2027-01-02",
}

// ===== Calcul des dates =====
const FIL = "ordures-maison"

function jour(a, m, j) { return new Date(a, m - 1, j) }
function ajouterJours(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function aHeure(d, h) { const r = new Date(d); r.setHours(h, 0, 0, 0); return r }
function cle(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
}
function lireCle(s) { const [a, m, j] = s.split("-").map(Number); return jour(a, m, j) }

function debutDe(c) { return aHeure(ajouterJours(c, -DEBUT_SIGNAL_JOURS_AVANT), 0) }
function finDe(c) { return aHeure(c, FIN_SIGNAL_HEURE) }
function rappelDe(c) { return aHeure(ajouterJours(c, -1), RAPPEL_HEURE) }

// Les collectes à venir (et la dernière passée), dans l'ordre.
function collectes(maintenant, combien) {
  const ref = jour(...PREMIERE_COLLECTE)
  const ecart = Math.round((aHeure(maintenant, 12) - aHeure(ref, 12)) / 86400000)
  let k = Math.max(0, Math.floor(ecart / INTERVALLE_JOURS) - 1)
  const liste = []
  while (liste.length < combien) {
    const normale = ajouterJours(ref, k * INTERVALLE_JOURS)
    const c = cle(normale)
    if (Object.prototype.hasOwnProperty.call(DEPLACEMENTS, c)) {
      if (DEPLACEMENTS[c]) liste.push(lireCle(DEPLACEMENTS[c]))
    } else {
      liste.push(normale)
    }
    k++
  }
  return liste.sort((a, b) => a - b)
}

function etatA(maintenant) {
  const liste = collectes(maintenant, RAPPELS_A_PLANIFIER + 3)
  const prochaine = liste.find(c => finDe(c) > maintenant)
  const actif = maintenant >= debutDe(prochaine)
  return {
    actif,
    prochaine,
    rappel: rappelDe(prochaine),
    prochainChangement: actif ? finDe(prochaine) : debutDe(prochaine),
    liste,
  }
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
function court(d) { return d.getDate() + " " + MOIS[d.getMonth()] }
function nomJour(d) { return JOURS[d.getDay()] }

// ===== Rappels (notifications locales) =====
async function planifierRappels(etat, maintenant) {
  const enAttente = await Notification.allPending()
  const anciens = enAttente.filter(n => n.threadIdentifier === FIL).map(n => n.identifier)
  if (anciens.length) await Notification.removePending(anciens)
  let n = 0
  for (const c of etat.liste) {
    const quand = rappelDe(c)
    if (quand <= maintenant) continue
    if (n >= RAPPELS_A_PLANIFIER) break
    const notif = new Notification()
    notif.identifier = FIL + "-" + cle(c)
    notif.threadIdentifier = FIL
    notif.title = "🗑️ Ordures ce soir"
    notif.body = "Mets le bac au chemin : collecte demain matin."
    notif.sound = "default"
    notif.setTriggerDate(quand)
    await notif.schedule()
    n++
  }
  return n
}

// ===== Widget =====
function construireWidget(etat, famille) {
  const w = new ListWidget()
  w.refreshAfterDate = etat.prochainChangement
  const blanc = Color.white()

  if (famille === "accessoryInline") {
    w.addText(etat.actif
      ? "🗑 Ordures " + nomJour(etat.rappel) + " soir"
      : "Pas d'ordures cette semaine")
    return w
  }

  if (famille === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true
    const pile = w.addStack()
    pile.layoutVertically()
    pile.centerAlignContent()
    const ligneImg = pile.addStack()
    ligneImg.addSpacer()
    const img = ligneImg.addImage(SFSymbol.named(etat.actif ? "trash.fill" : "trash").image)
    img.imageSize = new Size(22, 22)
    img.tintColor = blanc
    if (!etat.actif) img.imageOpacity = 0.35
    ligneImg.addSpacer()
    const ligneTxt = pile.addStack()
    ligneTxt.addSpacer()
    const t = ligneTxt.addText(etat.actif ? "OUI" : "non")
    t.font = Font.boldSystemFont(12)
    t.textColor = blanc
    if (!etat.actif) t.textOpacity = 0.35
    ligneTxt.addSpacer()
    return w
  }

  if (famille === "accessoryRectangular") {
    const titre = w.addText(etat.actif ? "🗑 Ordures cette semaine" : "Pas d'ordures")
    titre.font = Font.boldSystemFont(14)
    const sous = w.addText(etat.actif
      ? "Au chemin " + nomJour(etat.rappel) + " soir"
      : "Prochaine : " + nomJour(etat.prochaine) + " " + court(etat.prochaine))
    sous.font = Font.systemFont(12)
    return w
  }

  // Écran d'accueil (petit widget et autres tailles)
  w.backgroundColor = etat.actif ? new Color("#2E7D32") : new Color("#3A3A3C")
  w.setPadding(14, 14, 14, 14)
  const img = w.addImage(SFSymbol.named(etat.actif ? "trash.fill" : "trash").image)
  img.imageSize = new Size(34, 34)
  img.tintColor = blanc
  if (!etat.actif) img.imageOpacity = 0.5
  w.addSpacer()
  const titre = w.addText(etat.actif ? "Ordures" : "Pas cette semaine")
  titre.font = Font.boldSystemFont(etat.actif ? 22 : 16)
  titre.textColor = blanc
  const sous = w.addText(etat.actif
    ? nomJour(etat.rappel) + " soir"
    : "Prochaine : " + court(etat.prochaine))
  sous.font = Font.systemFont(13)
  sous.textColor = blanc
  sous.textOpacity = 0.85
  return w
}

// ===== Lancement =====
const maintenant = new Date()
const etat = etatA(maintenant)

let planifies = -1
try { planifies = await planifierRappels(etat, maintenant) } catch (e) { planifies = -1 }

if (config.runsInWidget) {
  Script.setWidget(construireWidget(etat, config.widgetFamily))
} else {
  const premier = rappelDe(etat.liste.find(c => rappelDe(c) > maintenant))
  const a = new Alert()
  a.title = etat.actif ? "Ordures cette semaine" : "Pas d'ordures cette semaine"
  a.message = (planifies >= 0
    ? planifies + " rappels prévus. Premier : " + nomJour(premier) + " " + court(premier) + " à " + RAPPEL_HEURE + " h."
    : "Les rappels n'ont pas pu être prévus : autorise les notifications de Scriptable (Réglages > Notifications).")
    + "\nProchaine collecte : " + nomJour(etat.prochaine) + " " + court(etat.prochaine)
  a.addAction("OK")
  await a.present()
  await construireWidget(etat, "small").presentSmall()
}
Script.complete()
