# Idées d’évolutions (non prévues tout de suite)

Idées envisageables pour plus tard, sans les mettre en place immédiatement.

---

## Mise à jour des rôles Discord selon le taux d’activité

**Idée :** En plus des messages récap en embed, un **bot Discord** mettrait à jour le **rôle** des membres de la guilde en fonction d’une **tranche unique** (Vert / Jaune / Orange / Rouge), avec une **couleur** par tranche. La couleur du pseudo reflète ainsi le niveau d’activité.

### Principe

1. **Calcul des deux indicateurs** : pour chaque membre avec le rôle « Raider » (ou équivalent), on calcule comme aujourd’hui le **taux de réponse** et le **taux de présence** (bases : toute la semaine pour la réponse, raids déjà passés pour la présence). Chacun donne une tranche : Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge &lt; 20 %.
2. **Rôle = pire des deux tranches** : la tranche finale pour le rôle est la **plus basse** des deux (la « pire »).  
   - Ex. : Vert en réponse + Orange en présence → **Orange**.  
   - Ex. : Jaune en réponse + Rouge en présence → **Rouge**.  
   Ainsi, il faut être bon sur **les deux** indicateurs pour avoir le vert.
3. **Quatre rôles dédiés** sur le serveur Discord, avec une couleur chacune : ex. « Activité Vert », « Activité Jaune », « Activité Orange », « Activité Rouge ».
4. **Mise à jour uniquement le dimanche à 19h30** : le bot ne met à jour les rôles **qu’une fois par semaine**, le **dimanche à 19h30** (heure locale). Le classement utilisé est celui de la **semaine qui se termine** (lundi → dimanche). Le rôle attribué reste en vigueur **jusqu’au dimanche 19h30 suivant** (classement de la semaine suivante). Pas de changement de rôle les autres jours.

Résultat : en un coup d’œil, la couleur du pseudo = niveau d’activité de la **semaine écoulée** (réponse et présence prises en compte, avec la règle du pire).

### Points techniques (quand tu voudras le faire)

| Sujet | Détail |
|-------|--------|
| **Permission bot** | Le bot doit avoir la permission **Gérer les rôles** (Manage Roles). |
| **Hiérarchie des rôles** | Le rôle du bot doit être **au-dessus** des quatre rôles « Activité X » dans la liste des rôles du serveur, sinon il ne peut pas les attribuer. |
| **Création des rôles** | Les 4 rôles (Vert / Jaune / Orange / Rouge) peuvent être créés à la main une fois, ou par le bot au premier run (avec des couleurs Discord cohérentes avec les embeds). |
| **Un seul rôle « activité » à la fois** | Pour chaque membre, on retire les rôles Vert / Jaune / Orange / Rouge puis on ajoute celui de sa tranche (la pire des deux : réponse et présence). |
| **Règle du pire** | Tranche réponse et tranche présence sont calculées ; on attribue le rôle de la **tranche la plus basse** (Rouge &lt; Orange &lt; Jaune &lt; Vert). |
| **Horaire de mise à jour** | **Dimanche 19h30** uniquement (cron ou tâche planifiée distincte du récap 23h). Données = semaine qui se termine ; le rôle reste fixe jusqu’au dimanche 19h30 suivant. |
| **Membres sans rôle « Raider »** | Le traitement ne concerne que les membres qui ont le rôle configuré (ex. Raider). Les autres ne reçoivent pas de rôle « Activité X ». |

### Intérêt

- **Visibilité immédiate** : la couleur du pseudo = niveau d’activité de la semaine (réponse et présence), sans lire le récap.
- **Règle du pire** : il faut être bon sur **les deux** indicateurs pour avoir le vert ; un point faible (ex. présence orange) fait descendre la couleur.
- **Stabilité hebdo** : mise à jour le dimanche 19h30 uniquement → le rôle reste fixe toute la semaine suivante, jusqu’au prochain classement.

### À faire plus tard si tu valides

- Ajouter dans la config (ex. `.env`) : les **IDs des 4 rôles** « Activité Vert/Jaune/Orange/Rouge » (ou une option pour les créer automatiquement).
- **Tâche dédiée** (ex. cron **dimanche 19h30** uniquement) : calcul des tranches **réponse** et **présence** pour la semaine qui se termine, puis pour chaque membre **tranche finale = min(tranche_réponse, tranche_présence)** (ordre : Rouge &lt; Orange &lt; Jaune &lt; Vert). Appeler l’API Discord pour retirer les anciens rôles activité et ajouter le rôle de la tranche finale.
- Gérer les erreurs (bot sans permission, rôle supprimé, etc.) et éventuellement un mode « récap seul / récap + rôles » pour tester sans toucher aux rôles.

Tu peux garder cette idée sous le coude et la mettre en place quand le récap quotidien tourne bien et que tu veux ajouter cette couche « rôle couleur » (mise à jour hebdo le dimanche 19h30, basée sur le pire des deux indicateurs).
