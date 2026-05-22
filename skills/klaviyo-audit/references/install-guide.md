# Guide d'installation — pas à pas pour débutants

Ce guide est destiné aux consultants qui n'ont jamais installé Node.js ou utilisé un terminal. **Claude lit ce document** et exécute les commandes à ta place — tu n'as qu'à répondre aux questions.

## Prérequis matériel

- Un ordinateur Mac, Windows ou Linux.
- Une connexion internet.
- Au moins **500 Mo d'espace disque libre** (dépendances Node + rapports générés).

## Prérequis logiciel

### 1. Claude Code

Si tu n'as pas encore Claude Code installé :

- **Mac** : <https://claude.ai/download>
- **Windows** : <https://claude.ai/download>
- **Linux** : `curl -fsSL https://claude.ai/install.sh | bash`

Ouvre Claude Code et connecte-toi à ton compte Anthropic.

### 2. Node.js

Node.js est le « moteur » qui fait tourner les scripts du plugin. Si tu ne sais pas si tu l'as :

Dans le terminal de Claude Code, demande à Claude : « Vérifie si Node.js est installé. » Il lancera `node --version`.

- Si la version affichée est **≥ 18** → c'est bon.
- Si pas installé ou trop ancien :
  - **Mac** : <https://nodejs.org/> (télécharger la version LTS) ou via Homebrew : `brew install node`
  - **Windows** : <https://nodejs.org/> (télécharger la version LTS) — installer en mode « Suivant > Suivant > Terminer ». Redémarrer le terminal après.
  - **Linux** : `sudo apt install nodejs npm` (Debian/Ubuntu) ou via nvm.

## Installation du plugin

### Méthode A — Depuis un dossier local (zip)

Si tu as reçu un dossier `klaviyo-audit/` :

1. Décompresse-le dans `~/.claude/plugins/` :
   - **Mac/Linux** : `~/.claude/plugins/klaviyo-audit/`
   - **Windows** : `C:\Users\[ton-nom]\.claude\plugins\klaviyo-audit\`
2. Vérifie que le fichier `.claude-plugin/plugin.json` existe à l'intérieur.
3. Redémarre Claude Code.

### Méthode B — Depuis un repo Git

Si tu as reçu un lien Git :

```bash
# Mac / Linux
cd ~/.claude/plugins/
git clone https://github.com/renardpublishing/klaviyo-audit.git

# Windows PowerShell
cd $env:USERPROFILE\.claude\plugins\
git clone https://github.com/renardpublishing/klaviyo-audit.git
```

Redémarre Claude Code.

### Vérification

Dans Claude Code, tape `/` — tu dois voir apparaître :
- `/audit-klaviyo-setup`
- `/audit-klaviyo`

Si ces commandes n'apparaissent pas : voir [troubleshooting.md](troubleshooting.md).

## Installation des dépendances Node

À faire **une seule fois** après l'installation du plugin. Demande à Claude :

> « Installe les dépendances Node du plugin Klaviyo audit. »

Il lance :
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && npm install
```

Compter 30 secondes à 2 minutes. Le message final attendu : `added X packages, found 0 vulnerabilities`.

## Génération de la clé API Klaviyo

C'est **la seule chose** que tu dois faire en dehors de Claude : créer une clé API sur ton compte Klaviyo.

1. Connecte-toi sur **klaviyo.com**.
2. En haut à droite, clique sur le nom de ton compte → **Settings**.
3. Dans la barre latérale, **API Keys**.
4. Bouton **Create Private API Key**.
5. **Nom** : par exemple « Audit mensuel Renard Publishing ».
6. **Permissions** : choisir **Read-only**. Coche au minimum :
   - **Campaigns**
   - **Flows**
   - **Metrics**
   - **Profiles**
   - **Lists**
7. **Create**.
8. **Copie la clé** affichée (elle commence par `pk_`) — elle n'est affichée **qu'une seule fois**.

> ⚠️ Ne partage **jamais** cette clé. Elle donne accès à toutes les données du client. Si tu la perds, régénère-la (et désactive l'ancienne).

## Configuration d'un client

Dans Claude Code :

```
/audit-klaviyo-setup
```

Claude te pose toutes les questions une à une :
- Slug du client (ex : `skwheel`)
- Clé API
- Nom, tagline, devise, intégration
- Tes infos (signature)
- Features à activer

À la fin, Claude :
- Crée le fichier `~/.klaviyo-audit/clients/[slug].json`
- Teste la connexion
- Te propose de générer le premier rapport

Tu peux configurer plusieurs clients en relançant `/audit-klaviyo-setup`.

## Génération d'un rapport

Dans Claude Code :

```
/audit-klaviyo
```

Claude te demande :
- Quel client (s'il y en a plusieurs)
- Quel mois

Le rapport est sauvegardé dans `~/.klaviyo-audit/output/` au format `.pptx`.

Ouvre-le dans PowerPoint, Keynote, ou Google Slides.

## Maintenance

### Mettre à jour le plugin

Si Renard Publishing publie une nouvelle version :

```bash
cd ~/.claude/plugins/klaviyo-audit
git pull
cd scripts && npm install   # si nouvelles dépendances
```

### Désinstaller le plugin

Supprime le dossier `~/.claude/plugins/klaviyo-audit/`. La config des clients dans `~/.klaviyo-audit/` reste — supprime-la aussi si tu veux tout nettoyer.

### Sauvegarder tes configs clients

Sauvegarde le dossier `~/.klaviyo-audit/clients/` (chiffré idéalement) — il contient les clés API. Ne le mets **jamais** sur GitHub public.
