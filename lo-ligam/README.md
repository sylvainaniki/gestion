# Lo Ligam · version pilote 0.1

Application de coordination associative inspirée du dossier COAC du 2 novembre 2026. Projet distinct de Dossier Clair.

## Disponible

- Application React/TypeScript responsive et manifeste PWA, icônes installables, écran hors connexion explicite.
- Connexion ChatGPT fournie par Sites. Une association privée, comptes adultes nominatifs, rôles admin/référent/membre/parent et permissions par commission.
- Événements créés depuis des modèles, tâches, créneaux, inscription/désistement. Une réservation simultanée de la dernière place ne peut produire qu’une confirmation.
- Détection des chevauchements, doublons et versions obsolètes. Mises à jour visibles par interrogation serveur toutes les 5 secondes quand l’application est au premier plan.
- Communications FR/OC : révisions conservées, validations distinctes, diffusion déclarée manuellement.
- Ressources texte/liens, matériel, budget indicatif en centimes et accueil confidentiel sous habilitation distincte.
- Invitations liées à l’email avec jeton aléatoire haché, expiration de 7 jours, usage unique. Aucun email automatique.
- Journal des actions et export JSON du seul périmètre accessible.

## Premier démarrage et accès

Le site doit rester propriétaire-privé jusqu’à son initialisation. Le propriétaire ouvre le site et clique « Créer mon espace partagé ». Cette action lui attribue le premier rôle administrateur. Ne pas rendre le site public avant cette initialisation.

Pour chaque autre adulte :
1. Autoriser son email dans le partage Sites du projet, sans lui donner le rôle d’éditeur du code.
2. Dans Lo Ligam → Administration, créer une invitation avec cet email, son rôle et sa commission.
3. Transmettre manuellement le lien personnel affiché. L’invité ouvre le lien, se connecte avec le compte ChatGPT correspondant et clique « Accepter mon invitation ».
4. Les habilitations confidentielles sont attribuées séparément par l’administrateur et journalisées. Un administrateur ne peut pas modifier ses propres droits dans cette interface.

Sur mobile, l’administration et l’installation se trouvent dans le bouton de profil en haut à droite. Le partage Sites et l’invitation applicative constituent deux contrôles distincts. Sans les deux, la personne ne voit aucune donnée.

## Installation

Android/ordinateur : menu du navigateur → Installer l’application si proposé. iPhone : ouvrir dans Safari → Partager → Sur l’écran d’accueil. Une connexion internet est requise ; les données associatives ne sont jamais mises en cache par le service worker. Pas d’APK et aucune publication App Store/Google Play.

## Architecture et limites

Vinext/React sur Cloudflare Workers ; base D1 fournie par Sites. La migration crée `organizations(id,version,data,updated_at)` ; la version pilote stocke l’état d’une association dans un agrégat JSON. Toute écriture utilise `UPDATE ... WHERE version = ?` et recommence les contrôles de droits/capacité après un conflit. La réservation, la notification et l’audit sont ainsi publiés atomiquement dans le même état.

Ce choix diffère du modèle PostgreSQL/Supabase proposé dans le dossier : il rend possible un premier pilote hébergé ici, sans créer un service externe. Il n’offre pas les politiques RLS PostgreSQL. L’autorisation est centralisée côté serveur ; aucune connexion directe à la base n’est exposée au navigateur. Les tests vérifient l’isolation des commissions et le refus des non-membres. L’ouverture multi-association reste désactivée. Une migration vers des tables normalisées sera nécessaire avant la montée en charge. Plafond de l’état pilote : 3 Mo ; historique des 500 dernières clés de requête ; pas de promesse de charge à 30 utilisateurs.

## Non livré / recette restante

Le dossier complet n’est pas entièrement réalisé. Restent : fichiers privés avec analyse/quarantaine, emails transactionnels et rappels planifiés, édition des dates avec reconfirmation des inscrits, gestion détaillée des rétentions/suppressions, pagination et indexation, validations de modèle avancées, pièces justificatives, modification/versionnage des ressources, passation guidée, reprise et restauration de production, audit externe et validation mobile sur appareils physiques.

La restauration JSON en mémoire est testée ; cela ne constitue PAS un exercice de restauration complète de la base et des fichiers de production. L’export utilisateur n’est PAS une sauvegarde technique exhaustive (il exclut notamment les secrets d’invitation). Ne pas ouvrir un pilote avec des coordonnées réelles avant ces vérifications et la désignation des responsables par l’association.

## Développement et tests

Node 22.13+ ; dépendances verrouillées par pnpm. `pnpm install --frozen-lockfile`, `pnpm dev` pour le développement via les scripts Sites. Les identités sont fournies par la passerelle Sites en production ; ne pas exposer directement le Worker à une passerelle non fiable autorisant la falsification des en-têtes d’identité.

```sh
node --test tests/domain.test.mjs
node node_modules/typescript/bin/tsc --noEmit
pnpm build
```

Les tests couvrent les refus de rôle, non-membre, commission, capacité concurrente via SQLite et comparaison de version, doublons, chevauchements, validations bilingues, contacts confidentiels, invitations, désactivation, conflits de tâche, annulation et roundtrip JSON. La production passe par le workflow Sites. Ne jamais inclure de jeton, identifiant de session ou donnée réelle dans Git.

## Sauvegarde, restauration et incident

Avant un pilote réel, définir un responsable et une rétention, obtenir une sauvegarde D1 via le fournisseur d’hébergement, restaurer dans un environnement de recette séparé et rejouer les tests d’accès avant réouverture. À ce stade, ce runbook n’a pas été exécuté en production. En cas d’accès compromis : retirer le partage Sites, désactiver le membre dans l’application, préserver le journal et investiguer. Les invitations non utilisées expirent après sept jours ; révocation manuelle d’une invitation encore à ajouter.
