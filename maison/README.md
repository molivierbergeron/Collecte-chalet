# Ordures — maison (Villeray, Montréal)

Widget iPhone (app Scriptable) qui dit si c'est la semaine des ordures, et rappel la veille à 19 h.

- Collecte aux deux semaines, le jeudi, à partir du 19 novembre 2026 (pas de collecte le 12).
- Widget allumé du vendredi jusqu'au jeudi midi la semaine de la collecte ; éteint l'autre semaine.
- Rappel : notification locale le mercredi à 19 h (26 rappels d'avance, renouvelés à chaque mise à jour du widget).
- Aucun serveur, aucune connexion : le téléphone calcule la semaine.

Installation : page « Ordures maison » (https://claude.ai/artifact/Hr6ZJBEo7UPZG524M275s5) — copier
`ordures-widget.js` dans Scriptable, le lancer une fois, puis ajouter le widget sur l'écran verrouillé.

Collecte déplacée par la Ville (Fêtes) : ajouter la date dans `DEPLACEMENTS` en haut du script, puis recoller
le script dans Scriptable.
