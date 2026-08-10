# Quel bac — document de mémoire et de décision

> Audit horodaté du **2026-08-02**, sur le commit `827b7a1` (2026-07-31 16:48:55 +0000).
> Ce fichier n'est jamais mis à jour après coup. Il porte la preuve technique au moment de l'audit ;
> l'état courant vit ailleurs.
>
> Le paramètre `[NOM_PRODUIT]` n'a pas été substitué dans la commande. Le nom retenu est celui
> que porte le produit lui-même : `<title>Quel bac</title>` (`index.html:9`), confirmé par
> `apple-mobile-web-app-title` (`index.html:8`). Le dépôt, lui, s'appelle `Collecte-chalet`.

---

## 1. Vision produit

**Ce que ça fait.** Ouvrir la page répond en un coup d'œil, sans lecture, à la seule question qui compte un soir de semaine : quel bac faut-il sortir. La réponse arrive sous forme de bandes de couleur pleine hauteur, lisibles à bout de bras (`index.html:60-64`, `.bac` en `clamp(2.9rem,13.5vw,6.5rem)`), avec le délai en clair et une pastille « au chemin ce soir » quand la collecte est le lendemain (`index.html:208`).

**Ce que ça remplace.** Le calendrier PDF de la Ville, qu'il fallait retrouver puis déchiffrer, et surtout le calcul mental « est-ce que c'est la semaine du recyclage ou du compost ». Les 93 dates de l'année sont transcrites dans le fichier (`index.html:137-139`) ; la page fait l'arithmétique à la place du CPO et ne montre que la fenêtre utile de 7 jours (`index.html:142`, `index.html:185`).

**Où ça s'arrête.** Trois frontières assumées. Le produit ne demandera **jamais de compte ni de connexion** : un audit de `index.html` ne trouve aucun appel réseau, aucune clé, aucun secret attendu — les deux seules références externes sont sa propre icône (`index.html:11-12`). Il ne servira **qu'un seul secteur** : `CAL` est une constante unique, sans notion d'adresse ni de zone (`index.html:136-140`). Et il ne deviendra **pas la source de vérité** : le fichier dit lui-même qu'il est un relevé du PDF officiel (`index.html:132-133`), et le bandeau de péremption renvoie l'utilisateur à `ville.stgabriel.qc.ca` (`index.html:179`). Ces trois limites sont ce qui permet à l'ensemble de tenir dans un fichier statique sans coût ni entretien d'infrastructure.

### État

| | |
|---|---|
| **Statut** | **Vivant** — dernier commit il y a 2 jours (`git log -1`, 2026-07-31 ; date système 2026-08-02) |
| **Dernière modification** | `827b7a1` — « Ne plus afficher une collecte le jour meme » |
| **Stack réelle** | 1 fichier HTML de 235 lignes, CSS et JS en ligne. Aucun build, aucun gestionnaire de paquets, aucun framework : `git ls-files` retourne 4 entrées (`index.html`, `apple-touch-icon.png`, `icone.svg`, `.nojekyll`) et aucun `package.json`, `Makefile`, `Dockerfile` ni `.github/`. Hébergé sur GitHub Pages en mode branche — le dépôt ne contient aucun workflow, or l'API expose des runs `dynamic/pages/pages-build-deployment` (run 5, `conclusion: success`), signature du déploiement par branche et non par Actions. |
| **Dépendances externes** | **Aucune au runtime.** Grep sur `https?://`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `import`, `<script src`, `@import` : zéro correspondance hors les deux `<link>` vers l'icône locale. |
| **Points de rupture** | (1) Le calendrier est daté : `ANNEE = 2026` (`index.html:141`) et toutes les dates sont construites sur cette constante (`index.html:158`). (2) Le démarrage à froid exige le réseau : aucun `serviceWorker`, aucun `manifest` dans l'arbre ni dans le source. (3) Hébergeur unique, sans repli. |
| **Coût récurrent** | **0 $.** Dépôt public + GitHub Pages. Charge servie : 8 646 o pour la page (3 521 o gzip) + 536 o d'icône, soit 9 182 o au total. Aucune clé d'API, aucun quota consommé à l'usage. |

---

## 2. Epics

### Epics socle

**S1 — Fiabilité.** *Est-ce que ça marche, et est-ce que ça échoue bruyamment plutôt qu'en silence ?*

Trois défaillances silencieuses établies. **(a)** Le bandeau de date affiche `ANNEE` au lieu de l'année réelle (`index.html:173`) : horloge forcée au 2027-01-04, la page annonce « lundi 4 janvier **2026** » — une date fausse, présentée avec le même aplomb qu'une date juste. **(b)** L'alerte de péremption ne se déclenche que sur changement d'année (`index.html:176`) : au 2026-12-28, test d'horloge, zéro bandeau `.stale` et l'écran affiche « Aucune collecte d'ici la fin de l'année ». Le produit est mort dix jours avant de le dire. **(c)** Aucun `try`, `catch` ni handler d'erreur global : une exception dans `rendre()` (`index.html:229`) laisse `#today`, `#bands` et `#suite` vides, tels que déclarés (`index.html:120-125`), sans distinguer la panne du cas « rien à sortir ».

En sens inverse, un point vérifié sain : `jourEcart` (`index.html:149`) traverse correctement les changements d'heure. Testé en `TZ=America/Montreal` sur les bascules 2026 (8 mars, 1er novembre) — écarts attendus 7, 7, 2, 2, obtenus 7, 7, 2, 2. Le `Math.round` absorbe les journées de 23 et 25 heures.

**S2 — Coût.** *Qu'est-ce que ce produit consomme, et est-ce que ça peut déraper ?*

Rien à signaler. 0 $, 9 182 o servis, aucune dépendance facturable, aucun quota lié à l'usage. Le seul vecteur de dérapage serait l'introduction d'un appel externe ; aucun item de la section 4 n'en réclame.

**S3 — Vitesse et friction.** *Combien de gestes et de secondes entre l'intention et la réponse ?*

Un geste depuis l'écran d'accueil. Le rendu est synchrone au chargement (`rendre()` appelé directement, `index.html:229`), sans requête ni attente : 3 521 o gzip et le calcul se fait sur des constantes déjà en mémoire. Le retour au premier plan re-rend sans réseau (`index.html:230-232`). La friction résiduelle est ailleurs — au **démarrage à froid**, qui exige le serveur faute de service worker.

**S4 — Analytics et observabilité.** *Sait-on si le produit sert, et peut-on diagnostiquer sans lire le code ?*

Non aux deux. Aucune donnée d'usage n'existe : le grep réseau confirme qu'il n'y a rien à émettre et rien qui reçoive. Aucune trace locale non plus — `localStorage` et `sessionStorage` sont absents du source. Conséquence directe : rien ne permet de savoir si la page est ouverte la veille (elle sert) ou le jour même (elle arrive trop tard), donc rien ne permet d'arbitrer sur données l'ajout d'un rappel.

**S5 — Dette technique.** *Est-ce que la prochaine modification coûtera plus cher que la précédente ?*

Faible et unique. 235 lignes, un fichier, sept fonctions toutes appelées — aucune fonction morte, aucun `TODO`, `FIXME`, `HACK` ni `XXX` (grep sur `index.html` et `icone.svg`). La dette tient en un point : les 93 dates littérales (`index.html:137-139`) sont **redondantes avec une règle**. Mesure faite sur les données elles-mêmes : ordures, 26 dates, toutes un lundi, écarts tous de 14 jours ; recyclage, 26 dates, toutes un vendredi, écarts tous de 14 jours ; compost, 41 dates, toutes un lundi, écarts de 7 ou 14 avec exactement deux bascules de rythme (`03-30 → 04-06`, passage à l'hebdomadaire ; `10-26 → 11-09`, retour au bimensuel). **Zéro exception sur 93 dates.** Chaque année, ce sont donc 93 saisies manuelles pour une information qui tient en six paramètres.

### Epics produit

**P1 — Survivre au changement d'année sans intervention**
- **Objectif :** donner la bonne réponse le 1er janvier 2027 sans que le CPO ait rouvert le fichier ni le PDF.
- **On saura que c'est atteint quand :** un 2 janvier, la page affiche une collecte correcte alors que le dernier commit du dépôt date de l'année précédente.

**P2 — Cesser d'exiger qu'on pense à elle**
- **Objectif :** que le bac sorte sans que le CPO ait eu à décider d'ouvrir la page ce soir-là.
- **On saura que c'est atteint quand :** un bac est sorti à temps un soir où la page n'a pas été ouverte.

**P3 — Tenir debout au chalet, hors couverture**
- **Objectif :** que la page s'ouvre à froid sans réseau, là où elle est précisément censée servir.
- **On saura que c'est atteint quand :** téléphone en mode avion, application évincée de la mémoire, l'ouverture depuis l'écran d'accueil affiche le bon bac.

---

## 3. Séquence par thème

**Maintenant.** À la fin de cette vague, la page ne peut plus afficher une information fausse en se présentant comme juste : l'année affichée suit l'horloge, l'alerte de péremption arrive pendant qu'il reste du temps pour agir, et une panne de rendu se voit au lieu de se confondre avec « rien à sortir ». Le dépôt sait aussi dire d'où viennent ses 93 dates, ce qu'il ne sait pas faire aujourd'hui.

**Ensuite.** La page cesse de dépendre d'une transcription annuelle : elle calcule ses dates au lieu de les réciter, et survit donc seule au passage à 2027. Elle commence par ailleurs à mesurer son propre usage localement, ce qui transforme la question du rappel — aujourd'hui une intuition — en une décision appuyée sur un hiver d'observation.

**Un jour.** La page s'ouvre sans réseau, à froid, et devient utilisable dans le seul endroit où l'absence de couverture est probable. C'est l'ambition à ne pas oublier et à ne pas commencer tant que les deux vagues précédentes ne sont pas faites : elle coûte le double de n'importe quel autre item pour un mode de défaillance qui exige deux conditions simultanées.

---

## 4. Items

| # | Item | Epic | Bénéfice concret | Effort | Sessions |
|---|---|---|---|---|---|
| 1 | Afficher l'année réelle | S1 | Le 4 janvier 2027, la page n'annonce plus « 2026 » | XS | 0,25 |
| 2 | Alerter dès le 1ᵉʳ décembre | S1 | Prévenu pendant qu'il reste 30 jours pour transcrire | XS | 0,25 |
| 3 | Rendre un plantage visible | S1 | Un écran vide cesse de se lire comme « rien à sortir » | XS | 0,25 |
| 4 | Écrire la provenance des dates | S5 | Revérifier les 93 dates sans rouvrir de conversation | S | 1 |
| 5 | Compter les ouvertures localement | S4 | Décider du rappel sur un hiver de données | S | 1 |
| 6 | Calculer les dates au lieu de les lister | P1 | Le 1ᵉʳ janvier 2027 répond juste, sans commit | L | 4 |
| 7 | Exporter un abonnement `.ics` | P2 | Le téléphone alerte la veille, page fermée | M | 2 |
| 8 | Ouvrir sans réseau | P3 | La page répond au chalet en mode avion | L | 4 |

**Total sessions estimées : 12,75**

---

### [1] Afficher l'année réelle dans le bandeau de date

- **Constat :** `index.html:173` compose le bandeau avec la constante `ANNEE`, pas l'année de l'horloge. Vérifié par test d'horloge : au 2027-01-04, `#today` contient « lundi 4 janvier 2026 » ; au 2028-03-06, « lundi 6 mars 2026 ».
- **Bénéfice :** le premier matin de 2027 où le CPO ouvre la page, il lit une date de l'an passé sous les yeux et doit décider si c'est la page ou lui qui se trompe. Ce doute disparaît.
- **Proposition :** remplacer `${ANNEE}` par `auj.getFullYear()` à la ligne 173. La constante `ANNEE` reste utilisée pour construire les dates du calendrier (`index.html:158`) et pour le test de péremption (`index.html:176`), qui sont deux usages légitimes.
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 100 %

### [2] Déclencher l'alerte de péremption dès le 1ᵉʳ décembre

- **Constat :** `index.html:176` conditionne le bandeau `.stale` à `auj.getFullYear() !== ANNEE`. Vérifié : au 2026-12-28, la page affiche zéro bandeau `.stale` et « Aucune collecte d'ici la fin de l'année ». La dernière collecte du calendrier est le 21 décembre ; du 22 au 31 décembre, le produit est inutile et muet.
- **Bénéfice :** l'avertissement arrive alors qu'il reste un mois pour transcrire le PDF au calme, plutôt qu'un matin de janvier où il faut sortir un bac tout de suite.
- **Proposition :** élargir la condition au mois de décembre de l'année en cours, et distinguer les deux messages — « calendrier bientôt épuisé » avant la bascule, « calendrier périmé » après. Le garde `!document.querySelector(".stale")` reste nécessaire, `rendre()` pouvant être appelé plusieurs fois sur la même page (`index.html:230-232`).
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 95 % — le seuil du 1ᵉʳ décembre est un choix, pas une déduction (voir décision D2).

### [3] Rendre un plantage de rendu visible

- **Constat :** aucun `try`, `catch`, `onerror` ni écouteur d'erreur global dans `index.html` (grep). `rendre()` est appelé nu à la ligne 229. Les trois conteneurs qu'il remplit sont déclarés vides (`index.html:120-125`), donc une exception laisse un écran qui ressemble à un écran normal sans collecte.
- **Bénéfice :** le soir où une modification casse le rendu, le CPO voit un message d'erreur au lieu de conclure qu'il n'y a rien à sortir et de laisser le bac dans le garage.
- **Proposition :** envelopper l'appel de la ligne 229 et celui de la ligne 231 dans un `try/catch` qui écrit le message d'erreur dans `#bands`, en réutilisant le style `.stale` déjà défini (`index.html:103-106`). Aucun nouveau CSS.
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 90 % — couvre les exceptions de `rendre()`, pas une erreur de syntaxe qui empêcherait le script entier de s'évaluer.

### [4] Écrire la provenance des 93 dates

- **Constat :** aucun `README`, aucun `docs/`, aucune licence — `ls` sur le dépôt ne retourne que les 4 fichiers suivis. La seule trace de l'origine des données est un commentaire de quatre lignes (`index.html:132-135`) et un nom de domaine dans un message d'erreur (`index.html:179`). Ni la date du relevé, ni l'URL exacte du PDF, ni la méthode de transcription ne sont consignées.
- **Bénéfice :** en décembre, quand il faudra rentrer le calendrier 2027, le CPO retrouve en trente secondes quel document ouvrir et sous quelle forme saisir, au lieu de reconstituer la démarche.
- **Proposition :** un `README.md` à la racine couvrant quatre points : l'URL du PDF source et la date du relevé, le format attendu des trois listes (`MM-JJ` séparés par des virgules), la procédure de mise à jour annuelle, et le mode de déploiement constaté (Pages en mode branche, tout push sur `main` republie).
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 100 %
- *Taille : doute entre XS et S levé vers S — un README utile dépasse les 30 lignes du seuil XS.*

### [5] Compter les ouvertures localement

- **Constat :** ni `localStorage`, ni `sessionStorage`, ni aucun appel réseau dans `index.html` (grep). Aucune donnée d'usage n'est produite ni conservée.
- **Bénéfice :** après un hiver, le CPO lit un chiffre unique — la part d'ouvertures faites la veille d'une collecte contre celles faites le jour même — et sait si la page arrive à temps ou constate des oublis. L'item 7 se décide alors sur cette observation.
- **Proposition :** à chaque `rendre()`, empiler un horodatage et le délai de la prochaine collecte dans un tableau `localStorage` plafonné à quelques centaines d'entrées, et exposer le décompte derrière un geste discret (appui long sur le bandeau de date). Aucune donnée ne quitte l'appareil, ce qui préserve la frontière « pas de compte, pas de serveur » et reste compatible avec l'item 8.
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 85 % — la mesure est fiable sur l'appareil instrumenté ; elle ne dira rien d'un usage depuis un autre téléphone du foyer.

### [6] Calculer les dates au lieu de les lister

- **Constat :** les trois listes de `index.html:137-139` totalisent 93 dates littérales, réécrites à la main chaque année. L'analyse de ces données montre qu'elles sont **entièrement régulières** : ordures, 26 dates, toutes un lundi, 25 écarts de 14 jours sans exception ; recyclage, 26 dates, toutes un vendredi, 25 écarts de 14 jours sans exception ; compost, 41 dates, toutes un lundi, écarts de 7 ou 14 avec deux bascules seulement (`03-30 → 04-06` et `10-26 → 11-09`). Trois collectes tombent un férié québécois sans décalage : compost le 18 mai (Patriotes), compost le 7 septembre (Fête du Travail), ordures **et** compost le 12 octobre (Action de grâce).
- **Bénéfice :** le 1ᵉʳ janvier 2027, la page affiche la bonne collecte alors que personne n'a touché au dépôt depuis l'été. La corvée de transcription annuelle disparaît, et avec elle le risque de coquille sur 93 saisies.
- **Proposition :** remplacer `CAL` par six paramètres — une date d'ancrage et un pas pour chaque matière, plus les deux dates de bascule du compost — et générer les collectes de l'année courante dans `collectes()` (`index.html:153-161`). Le reste du fichier consomme déjà une liste d'objets `{matiere, date}` triée et n'a pas à changer.
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 75 % — la régularité est établie sur 2026, une seule année. L'absence de décalage sur trois fériés est un indice fort que la Ville ne décale pas, mais un règlement peut différer d'une année à l'autre. Le PDF 2027 tranchera ; d'ici là c'est une extrapolation, pas une lecture.
- *Taille L : changement de structure de données au sens de la table de comptage.*

### [7] Exporter un abonnement `.ics`

- **Constat :** le produit n'a aucun mécanisme de rappel — pas de notification, pas de service worker, aucun export. Il faut décider d'ouvrir la page pour qu'elle serve, ce qui suppose d'avoir déjà pensé à la collecte.
- **Bénéfice :** le téléphone sonne à 19 h la veille, application fermée, et le bac sort sans que le CPO ait pensé à consulter quoi que ce soit.
- **Proposition :** générer un fichier `collectes.ics` statique à la racine, un `VEVENT` par collecte avec un `VALARM` la veille au soir, et le lier depuis le pied de page. C'est le calendrier du système qui alerte : aucun serveur, aucun compte, aucune permission de notification — la frontière posée en section 1 tient.
- **Dépend de :** 6 — sans génération par règles, le `.ics` expire fin 2026 comme le reste, et l'abonnement continuerait de se synchroniser sur un fichier vide sans rien signaler.
- **Confiance que ça règle le constat :** 80 % — dépend du comportement de rafraîchissement des abonnements `.ics` sur l'appareil du CPO, que je ne peux pas observer d'ici.
- *Taille M : trois fichiers touchés (le `.ics`, le générateur, `index.html`), aucune dépendance nouvelle.*

### [8] Ouvrir sans réseau

- **Constat :** aucun `serviceWorker` ni `manifest` dans le source ni dans l'arbre du dépôt. Le re-rendu au retour au premier plan fonctionne hors ligne depuis `4aab047` (`index.html:230-232`), mais le **premier** chargement passe par le réseau.
- **Bénéfice :** au chalet sans couverture, l'ouverture depuis l'écran d'accueil affiche le bon bac au lieu de la page d'erreur du navigateur.
- **Proposition :** un `sw.js` en cache-first sur les trois ressources servies, un `manifest.webmanifest`, et l'enregistrement du worker dans `index.html`. Le versionnement du cache doit être traité dès la première version, sans quoi une mise à jour du calendrier resterait invisible sur un appareil déjà installé.
- **Dépend de :** rien
- **Confiance que ça règle le constat :** 85 % — la mise en cache est acquise ; la date d'éviction d'une PWA de la mémoire par iOS ne se contrôle pas.
- *Taille : doute entre M et L levé vers L — un service worker introduit un cycle install/activate/fetch et une politique de version, ce qui refond le chemin de chargement plutôt que d'ajouter un fichier.*

### Écarté

- **Collectes spéciales (gros rebuts, RDD, sapins, feuilles).** Le produit ne modélise que trois matières (`index.html:136-140`), donc toute autre collecte publiée par la Ville est absente. Dimensionner l'item exigerait de connaître ces données : **non vérifiable ici**, la politique d'egress de la session refuse `ville.stgabriel.qc.ca` (403 au CONNECT, confirmé par le journal du proxy). Redevient un item dès que le PDF est en main.
- **Heure de bascule configurable.** La page change de jour à minuit, heure de l'appareil (`index.html:169`). Aucun préjudice constaté : les tests d'horloge sur les jours J, veilles et creux n'ont produit aucune réponse fausse. Sans constat, pas d'item.
- **Sélection du secteur / multi-adresse.** Contredit frontalement la frontière posée en section 1 (« ne servira qu'un seul secteur »). Tant que cette frontière tient, l'item n'existe pas ; si elle tombe, c'est la vision qu'il faut réécrire d'abord.
- **Traceur d'analytics externe.** Ajouterait un appel réseau à une page dont l'item 8 vise précisément l'autonomie hors ligne, et une dépendance facturable là où le coût récurrent est nul. L'item 5 répond à la même question sans rien de tout ça.

---

## 5. Décisions qui appartiennent au CPO

**D1 — Le calendrier régulier est-il une règle ou une coïncidence 2026 ?**
Les 93 dates ne présentent aucune exception, et trois collectes tombent un férié sans décalage. L'item 6 vaut 4 sessions et repose entièrement sur l'hypothèse que la Ville applique une règle fixe. Le CPO a-t-il un calendrier d'une année antérieure sous la main pour trancher, ou accepte-t-il l'extrapolation avec un filet — par exemple une liste d'exceptions vide mais prête à recevoir ?

**D2 — Combien de préavis avant la péremption du calendrier ?**
L'item 2 propose le 1ᵉʳ décembre, soit un mois. Trois semaines, deux mois, ou dès la dernière collecte du calendrier sont des choix également défendables ; celui-ci dépend de la façon dont le CPO veut être dérangé, pas du code.

**D3 — Le produit doit-il rappeler, ou seulement répondre ?**
L'item 7 fait franchir au produit la ligne entre outil consulté et outil qui interpelle. C'est un changement de nature, pas une fonctionnalité de plus. Si la réponse est non, l'item 7 sort et l'epic P2 avec lui — et le document doit le refléter plutôt que le garder en réserve.

**D4 — Quel seuil d'usage justifie de continuer d'investir ?**
L'item 5 produira un chiffre. Le CPO doit dire à l'avance ce qu'il en fera : en dessous de quelle fréquence d'ouverture les items 6, 7 et 8 ne valent plus les 10 sessions qu'ils coûtent ensemble. Sans seuil fixé avant la mesure, la donnée servira à justifier ce qui aura déjà été décidé.

**D5 — Un seul foyer, ou le village ?**
La frontière « un seul secteur » est aujourd'hui ce qui garde le produit à 235 lignes et 0 $. Elle est révocable, mais elle est structurante : la lever fait entrer une notion d'adresse, donc un état, donc un choix de stockage. Cette décision se prend avant l'item 6, pas après — la façon de générer les dates n'est pas la même selon qu'il y a un secteur ou plusieurs.
