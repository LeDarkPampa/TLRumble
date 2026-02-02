# Idées d'affichage pour le récap (~60 membres)

Le récap quotidien à 23h envoie **deux messages distincts** :

1. **Message 1 — Taux de réponse** au Raid-Helper : toute réponse compte (présent, absent, en retard, tentative, declined, etc.).
2. **Message 2 — Taux de présence** : uniquement les membres **vraiment inscrits / présents** (ex. status accepted selon l’API Raid-Helper).

Chaque message utilise les **4 tranches** suivantes :

| Couleur | Seuil | Signification |
|---------|--------|----------------|
| **Vert** | ≥ 80 % | Très bon |
| **Jaune** | ≥ 50 % | Correct |
| **Orange** | ≥ 20 % | À améliorer |
| **Rouge** | &lt; 20 % | Très faible |

---

## Contraintes Discord (rappel)

- **Message simple :** 2000 caractères max.
- **Embed :** 1 titre (256), 1 description (4096), jusqu’à 25 champs ; **chaque valeur de champ = 1024 caractères max**.
- **Fichier joint :** possible (ex. `.txt`), pas de limite de taille abusive.

---

## Format retenu : deux embeds (réponse + présence)

**Choix validé :** utilisation d’**embeds** Discord pour un affichage plus propre (titres, blocs, couleurs). Chaque jour à 23h, le bot envoie **deux messages** (chacun avec un embed) : un pour le **taux de réponse**, un pour le **taux de présence**. Chacun avec un résumé + **4 tranches** (Vert / Jaune / Orange / Rouge).

### Message 1 — Taux de réponse

- **Titre :** `Récap Raid-Helper — Taux de réponse — Lundi 2 → Mercredi 4 mars (5 raids)`
- **Description ou premier champ :** `60 membres · 5 raids cette période · toute réponse au Raid-Helper compte (présent, absent, en retard, etc.)`
- **Champ 1 — Vert ≥ 80 % (12)** : liste des pseudos.
- **Champ 2 — Jaune ≥ 50 % (15)** : liste des pseudos.
- **Champ 3 — Orange ≥ 20 % (18)** : liste des pseudos.
- **Champ 4 — Rouge &lt; 20 % (15)** : liste des pseudos (dont 0 %).

Si une tranche dépasse 1024 caractères (ex. 40 noms), la couper en 2 champs (ex. Rouge A–M et Rouge N–Z).

### Message 2 — Taux de présence

- **Titre :** `Récap Raid-Helper — Taux de présence — Lundi 2 → Mercredi 4 mars (5 raids)`
- **Description ou premier champ :** `60 membres · 5 raids · uniquement les inscrits / présents (ex. accepted)`
- **Champ 1 — Vert ≥ 80 % (10)** : liste des pseudos.
- **Champ 2 — Jaune ≥ 50 % (12)** : liste des pseudos.
- **Champ 3 — Orange ≥ 20 % (20)** : liste des pseudos.
- **Champ 4 — Rouge &lt; 20 % (18)** : liste des pseudos.

Même logique de découpage si une tranche est trop longue.

---

## Rendre les embeds plus jolis (Discord)

Quelques options pour un affichage soigné :

| Élément | Suggestion |
|--------|------------|
| **Couleur de l’embed** | Message 1 (réponse) : ex. `0x57F287` (vert) ou `0x5865F2` (bleu Discord). Message 2 (présence) : ex. `0xFEE75C` (jaune) ou autre pour distinguer. |
| **Titre** | Court et clair : « Taux de réponse — Semaine du 2 mars (12 raids) » avec émoji optionnel (ex. 📊). |
| **Description** | Une ligne : « 60 membres · 12 raids · toute réponse compte » (message 1) ou « … uniquement les inscrits présents » (message 2). |
| **Champs** | Nom du champ = « 🟢 Vert ≥ 80 % (14) » pour garder la couleur visuelle ; valeur = liste de pseudos (séparés par des virgules ou retours à la ligne). |
| **Timestamp** | `embed.setTimestamp()` pour afficher l’heure d’envoi en bas de l’embed. |
| **Footer** | Optionnel : « Récap automatique · Raid-Helper » pour rappeler l’origine. |

Limites Discord : titre 256 car., description 4096, nom de champ 256, **valeur de champ 1024**, max 25 champs par embed. Adapter le découpage des listes si une tranche dépasse 1024 caractères.

---

## Tranches (configurables)

| Variable (ex. `.env`) | Valeur par défaut | Description |
|----------------------|-------------------|-------------|
| `RECAP_THRESHOLD_GREEN` | 80 | Vert : ≥ ce pourcentage |
| `RECAP_THRESHOLD_YELLOW` | 50 | Jaune : ≥ ce pourcentage |
| `RECAP_THRESHOLD_ORANGE` | 20 | Orange : ≥ ce pourcentage |
| (Rouge) | — | Rouge : &lt; 20 % |

Ordre d’affichage des champs : Vert → Jaune → Orange → Rouge (du meilleur au moins bon).

---

## Définition « réponse » vs « présence »

À adapter selon les status réels de l’API Raid-Helper (à vérifier dans la doc ou les réponses JSON).

| Indicateur | Compte comme… | Exemple de status Raid-Helper (à confirmer) |
|------------|----------------|---------------------------------------------|
| **Réponse** | Toute réponse au raid (présent, absent, en retard, etc.) | accepted, tentative, declined, late, absent, … (tout sauf « pas de signup » / none) |
| **Présence** | Uniquement inscrit comme **présent** | accepted (et éventuellement tentative si tu considères que tentative = présent) |

Côté script : une liste configurable de status « compte comme réponse » et une liste « compte comme présence » (ou une règle simple : présence = accepted uniquement).

---

## Autres options possibles (complémentaires)

- **Liste complète en 3ᵉ message :** après les deux embeds, un 3ᵉ message avec la liste détaillée (une ligne par membre : `Pseudo : 5/7 réponse (71 %) · 4/7 présence (57 %)`) pour ceux qui veulent le détail. Découper en 2–3 messages si 60 lignes.
- **Fichier .txt en pièce jointe :** en plus des deux embeds, un fichier avec le tableau complet (réponse + présence par membre) pour archivage ou export.

---

## Synthèse

- **Deux messages par jour à 23h :** (1) Taux de réponse, (2) Taux de présence.
- **Quatre tranches par message :** Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge &lt; 20 %.
- **Un embed par message** avec résumé + 4 champs (liste des pseudos par tranche). Couper un champ en 2 si &gt; 1024 caractères.
- **Config :** seuils des tranches (optionnel en `.env`), mapping des status Raid-Helper pour « réponse » et « présence ».
