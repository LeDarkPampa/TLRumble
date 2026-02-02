# Idées d’indicateurs complémentaires (récap Raid-Helper)

En plus des **taux de réponse** et **taux de présence** déjà prévus, voici des idées d’indicateurs à calculer / suivre. Certains demandent des données ou du stockage en plus ; à valider selon la doc API Raid-Helper et la complexité que tu veux ajouter.

---

## 1. Indicateurs dérivés des signups (sans stockage)

Calculables à partir des événements + signups de la semaine (comme aujourd’hui).

| Indicateur | Description | Intérêt |
|------------|-------------|--------|
| **Taux d’absence déclarée** | % de raids où le membre a répondu **absent** (ou declined) sur le total des raids. | Distinguer « ne répond pas » (0 %) et « répond mais absent » (s’engage au moins). |
| **Taux « en retard » (late)** | % de raids où le membre s’est inscrit avec un status **late** (si l’API le fournit). | Repérer qui signe souvent en retard. |
| **Taux backup / tentative** | % de raids où le membre est en **backup** ou **tentative** (si l’API distingue). | Voir qui est souvent remplaçant plutôt que titulaire. |
| **Nombre de raids à 0 %** | Liste des membres avec **0 réponse** sur la semaine (déjà dans Rouge &lt; 20 %, mais peut être mis en avant). | Message ou champ dédié « Aucune réponse cette semaine » pour relance. |
| **Taux « full » (100 %)** | Liste des membres à **100 %** en réponse et/ou en présence. | Valoriser la régularité parfaite. |

---

## 2. Indicateurs agrégés (serveur)

Toujours calculables avec les données de la semaine, sans historique.

| Indicateur | Description | Intérêt |
|------------|-------------|--------|
| **Moyenne guilde (réponse / présence)** | Taux moyen de réponse et de présence sur tous les membres du rôle. | Comparer chaque membre à la moyenne (« au-dessus / en-dessous de la moyenne »). |
| **Médiane** | Médiane des taux (réponse ou présence). | Moins sensible aux extrêmes que la moyenne. |
| **Taux de remplissage des raids** | Pour chaque raid (ou en moyenne) : nombre d’inscrits présents / capacité ou nombre de places. | Vue « santé » des raids (souvent pleins ou non). |

---

## 3. Indicateurs avec historique (nécessitent du stockage)

Si tu stockes les récaps ou des stats par semaine (fichier, base, etc.).

| Indicateur | Description | Intérêt |
|------------|-------------|--------|
| **Tendance semaine N vs N−1** | Comparer le taux de la semaine en cours au taux de la semaine précédente (↗️ / ↘️ / →). | Voir qui progresse ou régresse. |
| **Régularité sur 2–4 semaines** | Moyenne ou min des taux sur les X dernières semaines. | Repérer les membres « toujours » verts ou « toujours » rouges. |
| **Série « sans réponse »** | Nombre de semaines consécutives à 0 % de réponse. | Prioriser les relances. |
| **Série « 100 % »** | Nombre de semaines consécutives à 100 %. | Badge / mise en avant. |

---

## 4. Indicateurs « timing » (si l’API le permet)

Dépendent de la présence de **date/heure de signup** par événement dans l’API Raid-Helper.

| Indicateur | Description | Intérêt |
|------------|-------------|--------|
| **Réponse en retard (délai)** | Heures/jours entre création du raid et réponse du membre (moyenne ou médiane). | Qui répond souvent au dernier moment. |
| **Ordre de réponse** | Position moyenne dans l’ordre des signups (1er, 2e, …). | Engagement rapide vs tardif. |

---

## 5. Synthèse : quoi ajouter en premier

- **Sans rien changer au stockage** : **taux d’absence déclarée**, **liste 0 % dédiée**, **taux full 100 %**, **moyenne guilde** (comparaison à la moyenne).  
- **Avec un peu de stockage** (ex. dernier récap en JSON) : **tendance semaine précédente**.  
- **À vérifier dans l’API** : champs **late**, **backup/tentative**, **date de signup** pour les indicateurs timing et backup.

Tu peux piocher dans cette liste au fur et à mesure (par ex. ajouter un 3ᵉ message « Absences déclarées » ou un champ « Moyenne guilde » dans les embeds existants), sans tout faire d’un coup.
