# Architecture du Custom Widget

## Vue d'ensemble

Le Custom Widget Grist DSFR React est une application React complète qui s'exécute dans un iframe au sein d'un document Grist. Il transforme Grist en un véritable backend et CMS tout en offrant une expérience utilisateur riche et moderne.

## Diagramme d'architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Navigateur Web                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Document Grist                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │   Tables de données métier                             │  │  │
│  │  │   - Beneficiaire                                       │  │  │
│  │  │   - Acheteur                                           │  │  │
│  │  │   - Repondant                                          │  │  │
│  │  │   - Marche                                             │  │  │
│  │  │   - Clause                                             │  │  │
│  │  │   - Specialite, Departement, Region, etc.             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │   Tables du widget (Application_*)                     │  │  │
│  │  │   - Application_Composants (code React)                │  │  │
│  │  │   - Application_Header (config en-tête)                │  │  │
│  │  │   - Application_Footer (config pied de page)           │  │  │
│  │  │   - Application_Liens (navigation)                     │  │  │
│  │  │   - Application_FAQ_Categories, FAQ_Questions          │  │  │
│  │  │   - Application_Env (variables d'environnement)        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │   Table d'authentification                             │  │  │
│  │  │   - AuthLink (tokens, rôles, références utilisateurs)  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │                            ↕                                  │  │
│  │                   Grist Plugin API                            │  │
│  │                (postMessage / iframe)                         │  │
│  │                            ↕                                  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │             Custom Widget (iframe)                      │  │  │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │  │
│  │  │  │  widget-app.html                                 │  │  │  │
│  │  │  │  - Structure HTML DSFR                           │  │  │  │
│  │  │  │  - <header>, <nav>, <main>, <footer>             │  │  │  │
│  │  │  │  - Conteneurs pour composants dynamiques         │  │  │  │
│  │  │  └──────────────────────────────────────────────────┘  │  │  │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │  │
│  │  │  │  Bibliothèques externes (CDN)                    │  │  │  │
│  │  │  │  - React 18 (react.production.min.js)            │  │  │  │
│  │  │  │  - ReactDOM 18 (react-dom.production.min.js)     │  │  │  │
│  │  │  │  - Babel Standalone (babel.min.js)               │  │  │  │
│  │  │  │  - Leaflet 1.9.4 (leaflet.js + CSS)              │  │  │  │
│  │  │  │  - DSFR 1.12.1 (dsfr.module.min.js + CSS)        │  │  │  │
│  │  │  │  - Grist Plugin API (plugin-api.js)              │  │  │  │
│  │  │  └──────────────────────────────────────────────────┘  │  │  │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │  │
│  │  │  │  widget-app.js (ReactApp class)                  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Initialisation                            │  │  │  │  │
│  │  │  │  │  - constructor()                           │  │  │  │  │
│  │  │  │  │  - init()                                  │  │  │  │  │
│  │  │  │  │  - grist.ready()                           │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Authentification                          │  │  │  │  │
│  │  │  │  │  - checkAuth()                             │  │  │  │  │
│  │  │  │  │  - Lecture token URL                       │  │  │  │  │
│  │  │  │  │  - Fetch AuthLink                          │  │  │  │  │
│  │  │  │  │  - Détermination du rôle                   │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Configuration UI                          │  │  │  │  │
│  │  │  │  │  - loadHeader()                            │  │  │  │  │
│  │  │  │  │  - loadFooter()                            │  │  │  │  │
│  │  │  │  │  - loadNavigation()                        │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Gestion des composants                    │  │  │  │  │
│  │  │  │  │  - loadComponent(id)                       │  │  │  │  │
│  │  │  │  │  - Fetch code depuis Application_Composants│  │  │  │  │
│  │  │  │  │  - Vérification permissions                │  │  │  │  │
│  │  │  │  │  - Transformation Babel (JSX → JS)         │  │  │  │  │
│  │  │  │  │  - Exécution dynamique (new Function)      │  │  │  │  │
│  │  │  │  │  - Rendu React (ReactDOM.render)           │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Navigation                                │  │  │  │  │
│  │  │  │  │  - navigate(componentId, params)           │  │  │  │  │
│  │  │  │  │  - pushState / popState                    │  │  │  │  │
│  │  │  │  │  - loadComponent()                         │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  │  ┌────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  API exposée (gristAPI)                    │  │  │  │  │
│  │  │  │  │  - React hooks (useState, useEffect, etc.) │  │  │  │  │
│  │  │  │  │  - Leaflet (L)                             │  │  │  │  │
│  │  │  │  │  - currentUser, isAuthenticated            │  │  │  │  │
│  │  │  │  │  - navigate(id, params)                    │  │  │  │  │
│  │  │  │  │  - getData(tableId)                        │  │  │  │  │
│  │  │  │  │  - addRecord, updateRecord, deleteRecord   │  │  │  │  │
│  │  │  │  │  - getEnv(key)                             │  │  │  │  │
│  │  │  │  │  - loadSharedComponent(id)                 │  │  │  │  │
│  │  │  │  └────────────────────────────────────────────┘  │  │  │  │
│  │  │  └──────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                 ↕
┌────────────────────────────────────────────────────────────────────┐
│                     Services externes                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │   n8n Workflows                                               │  │
│  │   - Authentification (génération tokens)                      │  │
│  │   - Upload CV (api/upload_cv.php)                             │  │
│  │   - Envoi d'emails (notifications)                            │  │
│  │   - Opérations serveur complexes                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Composants principaux

### 1. Document Grist

Le document Grist sert de backend complet :
- **Base de données** : Tables métier avec ACL au niveau des lignes
- **CMS** : Tables Application_* stockant le code des composants React
- **Authentification** : Table AuthLink avec tokens et rôles
- **Configuration** : Tables pour header, footer, navigation, FAQ, variables d'environnement

### 2. Custom Widget (iframe)

Widget hébergé dans un iframe au sein de Grist :
- **Isolation** : Contexte d'exécution séparé du document Grist
- **Communication** : Via Grist Plugin API (postMessage)
- **UI complète** : Structure HTML DSFR avec header, nav, main, footer
- **Bibliothèques** : React 18, Babel, Leaflet, DSFR chargés depuis CDN

### 3. ReactApp Class

Classe JavaScript principale qui orchestre tout :
- **Cycle de vie** : Initialisation, authentification, chargement des composants
- **Compilation dynamique** : Transformation JSX → JS avec Babel Standalone
- **Gestion d'état** : CurrentUser, composants chargés, cache
- **API unifiée** : Objet gristAPI exposé aux composants React

### 4. Composants React dynamiques

Code JSX stocké dans `Application_Composants` :
- **Chargement à la demande** : Compilé et exécuté dynamiquement
- **Accès API** : Via l'objet gristAPI injecté
- **Hooks React** : useState, useEffect, useCallback, useMemo, useRef
- **Bibliothèques externes** : Leaflet pour les cartes, DSFR pour le design

### 5. Services externes (n8n)

Workflows n8n pour opérations complexes :
- **Génération de tokens** : Lors de l'inscription
- **Upload de fichiers** : CV des bénéficiaires via api/upload_cv.php
- **Envoi d'emails** : Notifications automatiques
- **Traitements serveur** : Opérations nécessitant un backend

## Flux de données

### Lecture de données

```
Composant React → gristAPI.getData('TableName')
                       ↓
                  Grist Plugin API
                       ↓
              grist.docApi.fetchTable('TableName')
                       ↓
                  Grist Backend
                       ↓
            Application des règles ACL
                       ↓
        Filtrage selon currentUser et token
                       ↓
            Retour des données filtrées
                       ↓
                  Composant React
```

### Écriture de données

```
Composant React → gristAPI.updateRecord('Table', id, data)
                       ↓
                  Grist Plugin API
                       ↓
         grist.docApi.applyUserActions([
           ['UpdateRecord', 'Table', id, data]
         ])
                       ↓
                  Grist Backend
                       ↓
       Vérification ACL (droits d'écriture)
                       ↓
                 Mise à jour
                       ↓
           Confirmation au composant
```

## Flux d'authentification

```
1. Utilisateur reçoit email avec lien
   https://grist.example.com/widget?token=xxx&page=home

2. Widget charge, extrait le token de l'URL
   const token = new URLSearchParams(window.location.search).get('token')

3. checkAuth() fetch la table AuthLink
   const authData = await grist.docApi.fetchTable('AuthLink')

4. Grist applique les ACL
   - L'utilisateur ne voit que la ligne avec son token
   - Les règles ACL vérifient rec.token == token

5. Détermination du rôle
   if (authData.Beneficiaire) → role = 'beneficiaire'
   if (authData.Acheteur) → role = 'acheteur'
   if (authData.Repondant) → role = 'repondant'

6. Stockage dans this.currentUser
   { id, email, token, role, beneficiaire_id, acheteur_id, repondant_id }

7. Toutes les futures requêtes utilisent ce contexte
   - Les ACL filtrent automatiquement les données
   - L'utilisateur ne voit que ses propres données
```

## Flux de chargement d'un composant

```
1. Navigation → app.navigate('beneficiaire-profil')

2. loadComponent('beneficiaire-profil')
   ├─ Fetch Application_Composants
   ├─ Filtre: WHERE id = 'beneficiaire-profil'
   └─ Récupère: { id, nom, code, requires_auth, shared }

3. Vérification permissions
   ├─ Si requires_auth && !currentUser → Redirect login
   └─ Si requires_auth && currentUser → OK

4. Transformation Babel
   const transformed = Babel.transform(code, {
     presets: ['react'],
     filename: 'component.jsx'
   }).code;
   // JSX → JavaScript pur

5. Création fonction dynamique
   const componentFunction = new Function(
     'React',
     'gristAPI',
     transformed + '\nreturn MyComponent;'
   );

6. Exécution et récupération du composant
   const MyComponent = componentFunction(React, this.gristAPI);

7. Rendu React
   ReactDOM.render(
     React.createElement(MyComponent),
     document.getElementById('app-content')
   );

8. Le composant s'exécute
   - Accède aux données via gristAPI.getData()
   - Utilise les hooks React
   - Peut naviguer via gristAPI.navigate()
```

## Principes de conception

### Séparation des préoccupations

- **Grist** : Base de données, ACL, backend
- **Widget** : Présentation, logique métier UI
- **n8n** : Opérations serveur, intégrations externes

### Sécurité par défaut

- **ACL Grist** : Contrôle d'accès au niveau des lignes
- **Tokens** : Authentification via UUID
- **Sandbox iframe** : Isolation du contexte d'exécution

### Expérience développeur

- **JSX** : Syntaxe React familière
- **Hot reload** : Modifications immédiates via grist_sync.py
- **Console logs** : Débogage dans le navigateur
- **API simple** : gristAPI unifié pour toutes les opérations

### Performance

- **Chargement lazy** : Composants chargés à la demande
- **Cache** : Composants mis en cache après première compilation
- **CDN** : Bibliothèques externes servies depuis CDN
- **Pagination** : Données chargées par morceaux

## Architecture de fichiers

```
grist-dsfr-react-app/
├── widget-app.html          # Structure HTML du widget
├── widget-app.js            # Classe ReactApp et logique principale
├── README.md                # Documentation principale
├── docs/                    # Documentation détaillée
│   ├── 00-index.md
│   ├── 01-architecture.md   # Ce fichier
│   ├── 02-reactapp-class.md
│   └── ...
└── tools/
    └── grist_sync.py        # Outil de synchronisation

grist/
├── page/                    # Composants React (stockés aussi dans Grist)
│   ├── beneficiaire-home
│   ├── beneficiaire-profil
│   ├── beneficiaire-marches
│   ├── beneficiaire-annuaire
│   ├── acheteur-home
│   ├── acheteur-marches
│   └── ...
└── structure.txt            # Schéma du document Grist
```

## Évolution et extensibilité

### Ajout d'un nouveau composant

1. Créer le fichier dans `grist/page/mon-composant`
2. Coder en JSX avec accès à `gristAPI`
3. Push vers Grist : `python tools/grist_sync.py push mon-composant`
4. Naviguer : `gristAPI.navigate('mon-composant')`

### Ajout d'une nouvelle bibliothèque

1. Ajouter le `<script>` dans `widget-app.html`
2. Exposer dans `createGristAPI()` si nécessaire
3. Utiliser dans les composants via `gristAPI.NomBibliotheque`

### Nouvelle table métier

1. Créer la table dans Grist
2. Configurer les règles ACL
3. Accéder depuis les composants : `gristAPI.getData('NouvelleTable')`

### Nouveau rôle utilisateur

1. Ajouter une colonne Reference dans `AuthLink`
2. Mettre à jour `checkAuth()` pour détecter le rôle
3. Configurer les règles ACL pour le nouveau rôle
4. Créer les composants spécifiques au rôle

## Références

- [02-reactapp-class.md](02-reactapp-class.md) - Détails de la classe ReactApp
- [03-component-lifecycle.md](03-component-lifecycle.md) - Cycle de vie des composants
- [20-grist-api.md](20-grist-api.md) - API Grist détaillée
- [30-authentication-flow.md](30-authentication-flow.md) - Flux d'authentification complet
