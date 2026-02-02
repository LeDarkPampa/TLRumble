# Structure de l’API Raid-Helper (v3)

Documentation basée sur la réponse réelle de l’API. À compléter si d’autres endpoints sont utilisés (ex. détail des signups par événement).

---

## Endpoint utilisé

- **URL :** `GET https://raid-helper.dev/api/v3/servers/{GUILD_ID}/events`
- **Header :** `Authorization: <CLÉ_API>` (clé brute, sans "Bearer")
- **Réponse :** JSON avec pagination et liste d’événements

---

## Structure de la réponse

```json
{
  "pages": 1,
  "eventsOverall": 6,
  "eventsTransmitted": 6,
  "currentPage": 1,
  "postedEvents": [
    {
      "id": "1467642512532308088",
      "title": "Pierre de bénédiction",
      "description": "Guilde vs Guilde",
      "startTime": 1770061500,
      "endTime": 1770061500,
      "closeTime": 1770061500,
      "lastUpdated": 1770064713,
      "signUpCount": "20",
      "leaderId": "883046854336598066",
      "leaderName": "DarkPampa",
      "channelId": "1398035525159616553",
      "templateId": "43",
      "color": "255,0,0"
    }
  ]
}
```

### Champs importants pour le récap

| Champ | Type | Description |
|-------|------|-------------|
| **postedEvents** | tableau | Liste des événements (pas `events`). |
| **eventsOverall** | nombre | Nombre total d’événements côté serveur. |
| **startTime** | nombre | Timestamp Unix (secondes) du début de l’événement. |
| **endTime** | nombre | Timestamp Unix de fin. |
| **closeTime** | nombre | Timestamp Unix de fermeture des inscriptions. |
| **signUpCount** | string | Nombre d’inscriptions (texte). |
| **id** | string | ID de l’événement (pour un éventuel appel détail). |

### Pas de détail des signups dans cet endpoint

La liste v3 ne contient **pas** la liste des utilisateurs inscrits (qui a répondu, statut accepted/declined/etc.). Pour le récap par membre (taux de réponse, taux de présence), il faudra soit :

- un **autre endpoint** (ex. `GET /api/v2/events/{EVENT_ID}` pour le détail d’un événement avec signups), à vérifier dans la [doc Raid-Helper](https://raid-helper.dev/documentation/api) ;
- ou adapter la logique si la v3 expose les signups ailleurs (paramètre, sous-ressource, etc.).

---

## Fuseau et « semaine en cours »

- Les timestamps sont en **secondes** (Unix).
- Pour filtrer « événements de la semaine en cours » (lundi 0h → dimanche 23h59) : convertir les bornes en timestamp selon le fuseau configuré (`TIMEZONE`), puis garder les événements dont `startTime` est dans cet intervalle.

---

*Généré à partir de la réponse réelle de l’API (api-response-sample.json).*
