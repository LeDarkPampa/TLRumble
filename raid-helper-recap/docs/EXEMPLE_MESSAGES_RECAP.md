# Exemple concret des messages récap

**Format retenu : embeds Discord** pour un affichage plus lisible (titres, blocs, couleurs).

Exemple pour **mercredi 23h** : semaine avec **12 raids** (lundi → dimanche). Le dénominateur est fixe (12) ; le numérateur = nombre de ces raids auxquels le membre a **déjà répondu** à ce jour.

---

## Message 1 — Taux de réponse

*Toute réponse au Raid-Helper compte (présent, absent, en retard, tentative, declined, etc.).*

---

**Récap Raid-Helper — Taux de réponse — Semaine du 2 mars (12 raids)**

60 membres · 12 raids cette semaine · toute réponse compte (présent / absent / en retard / etc.)

**Vert ≥ 80 % (14)**  
Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hugo, Iris, Jake, Kate, Leo, Mia, Noah

**Jaune ≥ 50 % (16)**  
Oscar, Paula, Quinn, Rose, Sam, Tom, Uma, Victor, Wendy, Xavier, Yuki, Zack, Anna, Bruno, Clara, David

**Orange ≥ 20 % (18)**  
Emma, Felix, Gina, Henry, Ivy, Jack, Kelly, Liam, Mary, Nick, Olivia, Paul, Rita, Steve, Tina, Uri, Vera, Will

**Rouge < 20 % (12)**  
Xander, Yara, Zane, Alex, Beth, Chris, Dana, Eric, Fiona, Greg, Helen, Ian

---

*Sur Discord : chaque message = un **embed** avec titre, description (résumé), puis 4 champs. Chaque tranche = un champ (nom = « 🟢 Vert ≥ 80 % (14) », valeur = liste de pseudos). Couleur de l’embed possible (ex. vert pour réponse, jaune pour présence). Voir `docs/IDEES_AFFICHAGE_RECAP.md` pour les options d’affichage.*

---

## Message 2 — Taux de présence

*Uniquement les membres inscrits comme **présents** (ex. status accepted). Absent / declined / en retard = ne compte pas.*

---

**Récap Raid-Helper — Taux de présence — Semaine du 2 mars (12 raids)**

60 membres · 12 raids · uniquement les inscrits présents (accepted)

**Vert ≥ 80 % (10)**  
Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hugo, Iris, Jake

**Jaune ≥ 50 % (14)**  
Kate, Leo, Mia, Noah, Oscar, Paula, Quinn, Rose, Sam, Tom, Uma, Victor, Wendy, Xavier

**Orange ≥ 20 % (20)**  
Yuki, Zack, Anna, Bruno, Clara, David, Emma, Felix, Gina, Henry, Ivy, Jack, Kelly, Liam, Mary, Nick, Olivia, Paul, Rita, Steve

**Rouge < 20 % (16)**  
Tina, Uri, Vera, Will, Xander, Yara, Zane, Alex, Beth, Chris, Dana, Eric, Fiona, Greg, Helen, Ian

---

*Même structure que le message 1 : un embed avec titre + 4 champs (Vert / Jaune / Orange / Rouge). Les effectifs par tranche sont en général différents du message « réponse » (souvent plus de monde en orange/rouge sur la présence).*

---

## Version « comme sur Discord » (texte brut)

Si le bot envoie du **texte simple** (sans embed), ça pourrait ressembler à ça :

```
📊 Récap Raid-Helper — Taux de réponse — Semaine du 2 mars (12 raids)
60 membres · 12 raids · toute réponse compte

🟢 Vert ≥ 80 % (14)
Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Hugo, Iris, Jake, Kate, Leo, Mia, Noah

🟡 Jaune ≥ 50 % (16)
Oscar, Paula, Quinn, Rose, Sam, Tom, Uma, Victor, Wendy, Xavier, Yuki, Zack, Anna, Bruno, Clara, David

🟠 Orange ≥ 20 % (18)
Emma, Felix, Gina, Henry, Ivy, Jack, Kelly, Liam, Mary, Nick, Olivia, Paul, Rita, Steve, Tina, Uri, Vera, Will

🔴 Rouge < 20 % (12)
Xander, Yara, Zane, Alex, Beth, Chris, Dana, Eric, Fiona, Greg, Helen, Ian
```

Puis le **2ᵉ message** (taux de présence) avec la même structure, autres listes / effectifs.

---

## Remarques

- Les **pseudos** ci-dessus sont des exemples ; en prod ils viennent du Discord (displayName ou username).
- Si une tranche a **trop de noms** (> 1024 caractères), le bot coupe en 2 champs (ex. « Rouge A–M » et « Rouge N–Z »).
- **Couleurs Discord** : dans un embed, on peut mettre la couleur de l’embed (ex. vert pour le message réponse, bleu pour présence) ou laisser la couleur par défaut ; les émojis 🟢🟡🟠🔴 dans le **nom du champ** ou dans la valeur rendent les tranches visibles même en texte.
- **Date dans le titre** : ex. « Semaine du 2 mars » = lundi 2 mars (début de semaine) ; ou « Lundi 2 → Dimanche 7 mars » selon ta préférence.
