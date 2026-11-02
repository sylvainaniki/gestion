# gestion

## Dossier Clair — prototype 0.1

Application de collecte de dossiers pour agences web et communication, issue du concept A du dossier stratégique du 2 novembre 2026. Configuration sans code pour les utilisateurs, code commun maintenu pour le produit.

## Lancer

Node.js 22+ pour les tests ; Python 3 pour le serveur local.

```sh
npm test
npm start
```

Ouvrir http://localhost:3000. Aucun paquet npm à installer.

## Parcours disponible

- Tableau de bord calculé, recherche et filtre de dossiers.
- Création de dossiers à partir de modèles personnalisables et versionnés.
- Vue client de démonstration : saisie et dépôt de fichiers PDF/PNG/JPG/TXT de 1 Mo maximum.
- Validation, demande de correction commentée, progression, pause et historique.
- Simulation de relance au plus une fois par jour par dossier, sans email réel.
- Export JSON incluant fichiers en base64 ; sauvegarde globale.
- Nom d’organisation personnalisable, interface mobile.

## Limites explicites

Prototype frontend uniquement : localStorage dans le navigateur, quota variable. Ce stockage n’est pas un backend sécurisé, une sauvegarde distante ou un système multi-entreprise. Aucun compte client, invitation, email, facturation ni automatisation réelle. Ne pas saisir de données sensibles. Les fichiers ne quittent pas le navigateur. Une sauvegarde exportée inclut les fichiers : à conserver avec précaution. Import de sauvegarde non disponible. Les dates des exemples sont fictives et fixes.

## Étape suivante : pilote serveur

1. Authentification, organisations et memberships owner/member/guest ; contrôle serveur par organisation ET dossier pour toute lecture/écriture/téléchargement.
2. Base de données avec transactions ; version de modèle figée sur création du dossier.
3. Fichiers privés, quotas, validation de contenu et contrôles antivirus avant un pilote réel.
4. Invitations expirables et révocables, tests d’accès croisés et de révocation de fichiers.
5. File de relances avec idempotence persistante, reprise sur erreur, arrêt en pause/terminé et fournisseur email à configurer.
6. Exports complets, suppression et rétention définies, sauvegarde et restauration testées.
7. Cinq pilotes sur un seul segment ; ne pas présenter le prototype comme un SaaS prêt à vendre.

## Dépôt et publication

Code : https://github.com/sylvainaniki/gestion

Prototype privé : https://dossier-clair-sylvain.sylvainaniki.chatgpt.site

Le dépôt GitHub ne déclenche pas automatiquement une publication sur Sites. Le manifeste de déploiement propre à cet hébergement n’est pas nécessaire pour lancer ce prototype localement.
