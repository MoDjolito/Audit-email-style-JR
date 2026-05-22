# Klaviyo Audit — Plugin Claude Code

Plugin officiel **Renard Publishing** pour générer un rapport d'audit e-mail Klaviyo (PPTX) en quelques minutes, directement depuis Claude Code.

## En 30 secondes

1. Installer le plugin dans `~/.claude/plugins/klaviyo-audit/`.
2. Lancer `/audit-klaviyo-setup` une fois par client (questions interactives).
3. Lancer `/audit-klaviyo` chaque mois pour générer le rapport.

Le PPTX final atterrit dans `~/.klaviyo-audit/output/`, prêt à être livré au client.

## Ce qu'il fait

Récupère via l'API Klaviyo, pour un mois donné :

- **Campagnes envoyées** (newsletters) — destinataires, ouvertures, clics, ventes, CA
- **Séquences (flows)** — performance complète, comparaison M-1
- **Délivrabilité globale** — taux d'ouverture, clic, bounce, spam, désabonnement
- **Insights auto-générés** et benchmarks vs industrie

Produit une présentation PowerPoint de 9 à 11 slides au design **Renard Publishing** (fond sombre, accents or), prête à présenter en visio client.

Compatible avec **Shopify**, **WooCommerce**, **BigCommerce**, **Magento** et **Stripe**.

## Installation

Voir [`skills/klaviyo-audit/references/install-guide.md`](skills/klaviyo-audit/references/install-guide.md) pour le guide pas à pas (débutants).

## Slash commands disponibles

| Commande | Quand l'utiliser |
|----------|-------------------|
| `/audit-klaviyo-setup` | Première fois pour un client : configure clé API, infos client, features |
| `/audit-klaviyo` | Chaque mois : génère le rapport mensuel |

## Architecture

```
klaviyo-audit/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── audit-klaviyo-setup.md
│   └── audit-klaviyo.md
├── skills/
│   └── klaviyo-audit/
│       ├── SKILL.md
│       └── references/
│           ├── install-guide.md
│           ├── troubleshooting.md
│           └── customization.md
└── scripts/
    ├── index.js
    ├── config.js
    ├── klaviyo-api.js
    ├── generate-pptx.js
    ├── test-api.js
    └── package.json
```

Les configs clients sont stockées **hors du plugin**, dans `~/.klaviyo-audit/clients/[slug].json` (un fichier par client). Les rapports générés sont dans `~/.klaviyo-audit/output/`.

## Sécurité

- Les clés API Klaviyo sont stockées en local sur la machine du consultant, **jamais** dans le plugin ou un repo Git.
- Le plugin ne fait que des lectures sur Klaviyo (clé Read-only suffit).
- Les rapports contiennent du CA et des e-mails clients : à stocker dans un emplacement sécurisé.

## Désinstallation

Pour supprimer complètement le plugin et les configurations :

```bash
# Mac / Linux
rm -rf ~/.claude/plugins/klaviyo-audit
rm -rf ~/.klaviyo-audit   # ATTENTION : supprime aussi les configs clients et les rapports générés

# Windows PowerShell
Remove-Item -Recurse -Force $env:USERPROFILE\.claude\plugins\klaviyo-audit
Remove-Item -Recurse -Force $env:USERPROFILE\.klaviyo-audit
```

Pour ne supprimer que le plugin et garder les configs clients : ne pas supprimer `~/.klaviyo-audit/`.

## Support

- **Questions** : <jerome@renardpublishing.com>
- **Documentation Klaviyo API** : <https://developers.klaviyo.com>
- **Troubleshooting** : [`skills/klaviyo-audit/references/troubleshooting.md`](skills/klaviyo-audit/references/troubleshooting.md)

## Licence

UNLICENSED — Renard Publishing 2026. Distribué aux élèves de Renard Publishing uniquement.

---

*Développé par Jérôme Renard — Renard Publishing*
