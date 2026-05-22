# Troubleshooting — erreurs courantes

## Les slash commands `/audit-klaviyo*` n'apparaissent pas dans Claude Code

**Cause** : le plugin n'est pas détecté.

**Solutions** :
1. Vérifier que le dossier est bien dans `~/.claude/plugins/klaviyo-audit/` (Mac/Linux) ou `C:\Users\[user]\.claude\plugins\klaviyo-audit\` (Windows).
2. Vérifier que `.claude-plugin/plugin.json` existe à l'intérieur.
3. Redémarrer Claude Code.
4. Dans Claude Code, taper `/plugin list` pour voir si le plugin est listé.

## `node: command not found` ou `'node' is not recognized`

**Cause** : Node.js n'est pas installé ou pas dans le PATH.

**Solutions** :
- Installer Node.js depuis <https://nodejs.org/> (version LTS).
- Sur Windows, redémarrer le terminal (et parfois Claude Code) après installation.
- Vérifier la version : `node --version` doit afficher v18+.

## `Cannot find module 'pptxgenjs'` (ou autre dépendance)

**Cause** : les dépendances Node ne sont pas installées.

**Solution** :
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npm install
```

Attendre le message `added X packages`.

## `ERREUR: variable d'env KLAVIYO_AUDIT_CLIENT manquante`

**Cause** : le script a été lancé sans préciser quel client utiliser.

**Solution** : toujours utiliser les slash commands `/audit-klaviyo` ou `/audit-klaviyo-setup` qui définissent la variable automatiquement. Si tu lances le script à la main :

```bash
# Mac / Linux
KLAVIYO_AUDIT_CLIENT=skwheel REPORT_MONTH=2026-04 node index.js

# Windows PowerShell
$env:KLAVIYO_AUDIT_CLIENT="skwheel"; $env:REPORT_MONTH="2026-04"; node index.js
```

## `ERREUR: fichier de config introuvable: ~/.klaviyo-audit/clients/[slug].json`

**Cause** : le client n'a pas encore été configuré.

**Solution** : lancer `/audit-klaviyo-setup` pour le configurer.

## Erreur API `401 Unauthorized`

**Cause** : la clé API Klaviyo est invalide, expirée ou désactivée.

**Solutions** :
1. Vérifier la clé dans `~/.klaviyo-audit/clients/[slug].json` (champ `apiKey`).
2. Régénérer une nouvelle clé sur Klaviyo (Settings → API Keys), puis relancer `/audit-klaviyo-setup` pour la mettre à jour.
3. Vérifier que la clé a bien les permissions **Read-only** sur Campaigns, Flows, Metrics, Profiles, Lists.

## Erreur API `429 Too Many Requests`

**Cause** : limite de débit Klaviyo atteinte (le compte fait trop d'appels API en peu de temps).

**Solution** : le script gère automatiquement le retry. Si malgré tout l'erreur persiste, attendre 5 minutes et relancer. Sur de très gros comptes, il peut être nécessaire d'augmenter le délai.

## `Metrique "Placed Order" non trouvee dans Klaviyo`

**Cause** : aucune intégration e-commerce n'est connectée sur Klaviyo (Shopify, WooCommerce, BigCommerce, Magento, Stripe).

**Solution** :
1. Côté Klaviyo, vérifier les intégrations actives (Integrations → All integrations).
2. Si l'intégration existe mais n'est pas détectée : forcer le nom dans `~/.klaviyo-audit/clients/[slug].json` :
   ```json
   "client": {
     "integration": "Shopify"
   }
   ```

## Le rapport déborde / texte coupé / table trop longue

**Cause** : plus de 10 newsletters ou plus de 11 séquences actives dans le mois.

**Solution** : le skill split automatiquement à partir de ces seuils. Si malgré tout ça déborde (cas exotique avec >20 newsletters par mois), contacter Renard Publishing pour ajustement.

## Accents cassés / mojibake (« Ã© », « Ã¨ »...) sur Windows

**Cause** : PowerShell utilise par défaut un encodage qui ne gère pas bien l'UTF-8.

**Solution** : avant de lancer le script, activer l'UTF-8 dans le terminal :

```powershell
chcp 65001
```

Ou ajouter dans le profil PowerShell : `$OutputEncoding = [System.Text.Encoding]::UTF8`.

## CA à 0 € sur toutes les campagnes

**Cause** : la métrique de conversion utilisée ne correspond pas à l'intégration e-commerce active du compte (ex : Klaviyo a la métrique « Placed Order » Shopify ET WooCommerce, mais le skill prend la mauvaise).

**Solution** :
1. Vérifier dans les logs du script quelle intégration a été détectée.
2. Si plusieurs intégrations sont présentes, forcer la bonne dans `~/.klaviyo-audit/clients/[slug].json` :
   ```json
   "client": {
     "integration": "Shopify"
   }
   ```

## Rapport généré mais vide (toutes les valeurs à 0)

**Cause possible** : le mois choisi n'a aucune donnée (pas d'envoi ni de séquence active).

**Solution** : vérifier sur Klaviyo qu'il y a bien des campagnes envoyées et/ou des séquences actives pour le mois en question.

## Demande non couverte

Envoyer un message à **jerome@renardpublishing.com** avec :
- Le client concerné (slug, anonymisé si nécessaire)
- Le mois demandé
- Le message d'erreur complet
- La sortie console du script
