# Documentation technique du Custom Widget Grist DSFR React

## Table des matières

### 1. Architecture
- [01-architecture.md](01-architecture.md) - Architecture générale du widget
- [02-reactapp-class.md](02-reactapp-class.md) - Classe ReactApp en détail
- [03-component-lifecycle.md](03-component-lifecycle.md) - Cycle de vie des composants

### 2. Tables Grist
- [10-tables-overview.md](10-tables-overview.md) - Vue d'ensemble des tables
- [11-application-composants.md](11-application-composants.md) - Table Application_Composants
- [12-authlink.md](12-authlink.md) - Table AuthLink et système d'authentification
- [13-configuration-tables.md](13-configuration-tables.md) - Tables de configuration (Header, Footer, Liens)
- [14-support-tables.md](14-support-tables.md) - Tables de support (FAQ, Env, AI, etc.)

### 3. API et Communication
- [20-grist-api.md](20-grist-api.md) - API Grist et communication iframe
- [21-gristapi-object.md](21-gristapi-object.md) - Objet gristAPI exposé aux composants
- [22-crud-operations.md](22-crud-operations.md) - Opérations CRUD sur les données
- [23-attachments.md](23-attachments.md) - Gestion des fichiers et attachments

### 4. Authentification et Sécurité
- [30-authentication-flow.md](30-authentication-flow.md) - Flux d'authentification
- [31-acl-rules.md](31-acl-rules.md) - Règles ACL et contrôle d'accès
- [32-security-best-practices.md](32-security-best-practices.md) - Bonnes pratiques de sécurité

### 5. Navigation et Routing
- [40-navigation-system.md](40-navigation-system.md) - Système de navigation
- [41-url-parameters.md](41-url-parameters.md) - Paramètres d'URL
- [42-role-based-navigation.md](42-role-based-navigation.md) - Navigation basée sur les rôles

### 6. Développement
- [50-development-workflow.md](50-development-workflow.md) - Workflow de développement
- [51-grist-sync-tool.md](51-grist-sync-tool.md) - Outil de synchronisation grist_sync.py
- [52-debugging.md](52-debugging.md) - Débogage et résolution de problèmes
- [53-component-examples.md](53-component-examples.md) - Exemples de composants

### 7. Intégrations
- [60-dsfr-integration.md](60-dsfr-integration.md) - Intégration DSFR
- [61-leaflet-maps.md](61-leaflet-maps.md) - Cartes Leaflet
- [62-external-apis.md](62-external-apis.md) - APIs externes (n8n, etc.)

### 8. Référence
- [70-babel-transformation.md](70-babel-transformation.md) - Transformation JSX avec Babel
- [71-react-hooks.md](71-react-hooks.md) - Hooks React disponibles
- [72-shared-components.md](72-shared-components.md) - Système de composants partagés
- [73-error-handling.md](73-error-handling.md) - Gestion des erreurs

### 9. Production et Maintenance
- [80-performance.md](80-performance.md) - Optimisation des performances
- [81-limitations.md](81-limitations.md) - Limitations connues
- [82-maintenance.md](82-maintenance.md) - Guide de maintenance
- [83-troubleshooting.md](83-troubleshooting.md) - Résolution de problèmes courants

## Guide de démarrage rapide

Pour commencer rapidement avec le widget :

1. Lisez [01-architecture.md](01-architecture.md) pour comprendre l'architecture globale
2. Consultez [11-application-composants.md](11-application-composants.md) pour créer votre premier composant
3. Référez-vous à [21-gristapi-object.md](21-gristapi-object.md) pour utiliser l'API dans vos composants
4. Suivez [50-development-workflow.md](50-development-workflow.md) pour configurer votre environnement

## Conventions de documentation

- **Sections techniques** : Code samples et spécifications détaillées
- **Exemples pratiques** : Code fonctionnel et cas d'usage réels
- **Notes importantes** : Mises en garde et bonnes pratiques
- **Références croisées** : Liens vers les sections connexes

## Contribution

Cette documentation est maintenue par l'équipe de développement Eclauses. Pour toute question ou suggestion d'amélioration, contactez l'équipe technique.

---

**Dernière mise à jour** : 2026-01-05
