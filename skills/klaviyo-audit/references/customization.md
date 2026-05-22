# Personnalisation du rapport

## Direction artistique (couleurs, typo)

Le skill applique par défaut la **DA Renard Publishing** (fond sombre, accents or). Pour adapter à une autre charte :

1. Ouvrir `${CLAUDE_PLUGIN_ROOT}/scripts/generate-pptx.js`.
2. Chercher l'objet `COLORS` en haut du fichier (≈ ligne 33).
3. Remplacer les valeurs hexadécimales (sans le `#`).

Tokens principaux :

| Token | Rôle | Valeur Renard |
|-------|------|---------------|
| `navy` | Fond de slide | `1E1C19` |
| `darkBlue` | Cartes / sections | `252320` |
| `accent` | Couleur d'accent | `BF995A` (or) |
| `accentLight` | Hover / highlights | `D6B478` |
| `white` | Texte principal | `ECE9E3` |
| `medGray` | Texte secondaire | `7C796F` |
| `red` | Signaux négatifs | `C45C4A` |
| `altRow` | Lignes alternées tables | `29271F` |

Polices : `Arial Black` pour les titres, `Calibri` pour le corps. Modifier via les paramètres `fontFace` dans `generate-pptx.js` si besoin.

## Modifier les benchmarks marché

Par défaut, les benchmarks affichés sur la slide délivrabilité sont ceux du e-commerce général (sources : Klaviyo Benchmarks 2024 + Mailchimp 2024). Pour les adapter à un secteur précis (mode, beauté, B2B...) :

Éditer `~/.klaviyo-audit/clients/[slug].json` et ajouter :

```json
"benchmarks": {
  "openRate": 45.0,
  "clickRate": 2.1,
  "bounceRate": 0.4,
  "spamRate": 0.02,
  "unsubRate": 0.15
}
```

## Activer / désactiver les features

Dans `~/.klaviyo-audit/clients/[slug].json` :

```json
"features": {
  "topFlopHighlight": true,
  "industryBenchmarks": true,
  "autoInsights": true,
  "debug": false
}
```

Mettre `false` désactive la feature au prochain rapport généré.

## Modifier la slide « Prochaines étapes »

C'est la slide 8. Elle contient un placeholder qui doit être adapté manuellement chaque mois selon le contexte client.

### Option A — Modifier directement dans PowerPoint après génération

C'est la méthode la plus rapide pour un rapport ponctuel.

### Option B — Modifier le code

Ouvrir `${CLAUDE_PLUGIN_ROOT}/scripts/generate-pptx.js`, chercher la déclaration `const nextSteps = [` (≈ ligne 700+).

Modifier les éléments du tableau (max 3 recommandés pour rester lisible) :

```js
const nextSteps = [
  {
    num: "01",
    title: "Titre de l'étape",
    body: "Description courte (2-3 lignes max)."
  },
  ...
];
```

## Forcer une intégration e-commerce

Si le compte Klaviyo a plusieurs intégrations actives (ex : Shopify + WooCommerce), le skill prend Shopify par défaut. Pour forcer :

Éditer `~/.klaviyo-audit/clients/[slug].json` :

```json
"client": {
  "integration": "WooCommerce"
}
```

Valeurs possibles : `"Shopify"`, `"WooCommerce"`, `"BigCommerce"`, `"Magento"`, `"Stripe"`, ou `null` (auto-détection).

## Changer la devise

Éditer le champ `currency` dans `~/.klaviyo-audit/clients/[slug].json` :

```json
"client": {
  "currency": "€"
}
```

Symboles courants : `€`, `$`, `£`, `CHF`, `CA$`, `¥`. Le symbole est affiché tel quel à droite des montants.

## Changer le dossier de sortie

Par défaut les rapports sont dans `~/.klaviyo-audit/output/`. Pour changer :

Éditer `~/.klaviyo-audit/clients/[slug].json` :

```json
"outputDir": "/Users/jerome/Dropbox/Skwheel/Audits/"
```

Ou définir la variable d'environnement `OUTPUT_DIR` au runtime.

## Ajouter le logo client

⚠️ **Non encore implémenté** — prévu dans la roadmap v3.0.

En attendant, ajouter manuellement le logo dans PowerPoint après génération (slide 1).

## Ajouter une feature personnalisée

Si tu maîtrises Node.js et veux ajouter ta propre feature :

1. Ajoute la propriété dans `FEATURES` du `config.js` (avec valeur par défaut).
2. Dans `generate-pptx.js`, ajoute le code qui s'active si `config.FEATURES.taFeature === true`.
3. Documenter la feature dans `references/customization.md`.

Pour proposer ta feature à la communauté : envoyer un patch à jerome@renardpublishing.com.
