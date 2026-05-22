---
name: klaviyo-audit
description: Use this skill when the user asks to generate a Klaviyo e-mail audit report, a monthly Klaviyo report, an e-mail performance summary, or invokes /audit-klaviyo or /audit-klaviyo-setup. Triggers on terms like "rapport Klaviyo", "audit e-mail", "rapport mensuel e-mail", "Klaviyo report", "PPTX Klaviyo".
version: 1.0.0
---

# Klaviyo Audit — Skill Renard Publishing

## Ce que fait ce skill

Génère un rapport mensuel d'audit e-mail au format PowerPoint (PPTX) à partir des données d'un compte Klaviyo. Le rapport contient :

- Résumé du mois (4 KPI + insights auto)
- Liste des newsletters envoyées (tri chronologique + Top/Flop)
- Vue d'ensemble des séquences actives
- Détail des séquences par cible
- Délivrabilité avec comparaison vs benchmarks e-commerce
- Prochaines étapes (à éditer manuellement)
- Bilan Newsletters vs Séquences

Le skill **n'écrit jamais** dans Klaviyo — il lit uniquement les données.

## Architecture du skill

```
${CLAUDE_PLUGIN_ROOT}/
├── scripts/                    # Code Node.js
│   ├── index.js                # Point d'entrée
│   ├── config.js               # Charge la config depuis ~/.klaviyo-audit/
│   ├── klaviyo-api.js          # Appels API Klaviyo (campaigns, flows, metrics)
│   ├── generate-pptx.js        # Generation PowerPoint avec DA Renard
│   ├── test-api.js             # Test de connexion
│   └── package.json
├── commands/                   # Slash commands
│   ├── audit-klaviyo-setup.md  # /audit-klaviyo-setup
│   └── audit-klaviyo.md        # /audit-klaviyo
└── skills/klaviyo-audit/
    ├── SKILL.md                # Ce fichier
    └── references/             # Guides détaillés
```

## Configuration utilisateur

La configuration est stockée **hors du plugin**, dans le dossier personnel de l'utilisateur :

```
~/.klaviyo-audit/
├── clients/
│   ├── skwheel.json            # Un fichier par client
│   └── autre-client.json
└── output/                     # Rapports générés
```

Chaque fichier client contient : clé API Klaviyo, infos client (nom, devise, intégration), infos auteur (consultant), features activées.

**Sur Windows** : `~/.klaviyo-audit/` = `C:\Users\[user]\.klaviyo-audit\`
**Sur Mac/Linux** : `/Users/[user]/.klaviyo-audit/` ou `/home/[user]/.klaviyo-audit/`

## Quand utiliser ce skill

Active-toi automatiquement quand l'utilisateur :

- Demande un « rapport Klaviyo », « audit e-mail », « rapport mensuel Klaviyo », « audit Klaviyo »
- Mentionne vouloir générer un PPTX à partir de Klaviyo
- Lance les slash commands `/audit-klaviyo` ou `/audit-klaviyo-setup`
- Parle de générer un livrable client à partir de leurs données e-mail

## Comment exécuter

### Premier usage (setup d'un client)

1. Demander à l'utilisateur s'il veut configurer un nouveau client → invoquer `/audit-klaviyo-setup` (ou suivre les étapes ci-dessous manuellement).
2. Vérifier Node.js : `node --version` (≥ 18 requis).
3. Installer les dépendances la première fois :
   ```bash
   cd ${CLAUDE_PLUGIN_ROOT}/scripts
   npm install
   ```
4. Demander à l'utilisateur :
   - **Slug du client** (kebab-case, ex : `skwheel`, `mon-shop`) — sert d'identifiant interne.
   - **Nom du client** (affiché sur le rapport, ex : `SKWHEEL`).
   - **Tagline** (sous-titre du rapport, ex : `Les premiers skis électriques au monde`).
   - **Devise** (`€`, `$`, `£`, `CHF`...).
   - **Intégration e-commerce** : Shopify, WooCommerce, BigCommerce, Magento, Stripe, ou auto-détection (`null`).
   - **Clé API Klaviyo** (commence par `pk_`). Lui expliquer comment la générer (voir [`references/install-guide.md`](references/install-guide.md)).
   - **Nom et e-mail du consultant** (signature du rapport).
   - **Features à activer** :
     - `topFlopHighlight` — Encart Top / À surveiller (recommandé : oui)
     - `industryBenchmarks` — Benchmarks marché (recommandé : oui)
     - `autoInsights` — Insights générés automatiquement (recommandé : oui)
     - `debug` — Logs verbeux (recommandé : non)
5. Écrire le fichier `~/.klaviyo-audit/clients/[slug].json` avec ces valeurs.
6. Tester la connexion :
   ```bash
   KLAVIYO_AUDIT_CLIENT=[slug] node ${CLAUDE_PLUGIN_ROOT}/scripts/test-api.js
   ```
7. Si OK, proposer de générer un premier rapport pour le mois précédent.

### Usage récurrent (rapport mensuel)

1. Lister les clients disponibles : `ls ~/.klaviyo-audit/clients/`.
2. Demander à l'utilisateur :
   - Quel **client** (s'il y en a plusieurs).
   - Quel **mois** (format `YYYY-MM`, ex : `2026-04`).
3. Lancer :
   ```bash
   KLAVIYO_AUDIT_CLIENT=[slug] REPORT_MONTH=[YYYY-MM] node ${CLAUDE_PLUGIN_ROOT}/scripts/index.js
   ```
4. Le rapport est généré dans `~/.klaviyo-audit/output/`.
5. Annoncer le chemin du fichier généré à l'utilisateur.

## Sécurité

- **Ne jamais committer** les fichiers `~/.klaviyo-audit/clients/*.json` dans un repo Git — ils contiennent les clés API client.
- **Ne jamais afficher** la clé API en clair dans la conversation après le setup.
- Les clés Klaviyo doivent être en **Read-only** uniquement. Le skill ne modifie jamais Klaviyo.
- Les rapports contiennent du CA et des e-mails client : à stocker dans un emplacement sécurisé et supprimer après livraison.

## Références

- [`references/install-guide.md`](references/install-guide.md) — guide d'installation pas à pas pour les débutants.
- [`references/troubleshooting.md`](references/troubleshooting.md) — erreurs courantes et solutions.
- [`references/customization.md`](references/customization.md) — adapter la DA, ajouter des features.

## Roadmap

Features futures à implémenter sur demande utilisateur :

- Croissance de la liste (inscrits / désabonnés / taille)
- Funnel global (Envoyé → Délivré → Ouvert → Cliqué → Acheté)
- Ratio CA e-mail / CA total Shopify
- Top segments, top produits, top liens cliqués
- Mobile vs desktop
- Comparaison M-3, M-6, M-12, YTD
- Heatmap horaire
- Export PDF
- Mode multi-mois (trimestre/année)

Quand l'utilisateur en demande une, dire que c'est prévu et noter sa demande.
