# Grist DSFR React Custom Widget

## Vue d'ensemble

Ce widget personnalisé Grist permet de créer une application web React complète directement à partir des tables Grist. Il combine le Système de Design de l'État Français (DSFR) avec React 18 pour créer une interface utilisateur moderne et accessible, tout en utilisant Grist comme backend et système de gestion de contenu.

> **📚 Documentation complète** : Consultez la [documentation détaillée dans docs/](docs/00-index.md) pour une référence technique exhaustive.

### Architecture générale

```
┌─────────────────────────────────────────────────────────────┐
│                    Grist Document                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables Application_*                                 │   │
│  │  - Application_Composants (code React des pages)     │   │
│  │  - Application_Header (configuration en-tête)        │   │
│  │  - Application_Footer (configuration pied de page)   │   │
│  │  - Application_Liens (liens de navigation)           │   │
│  │  - AuthLink (authentification et contrôle d'accès)   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Custom Widget (iframe)                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  widget-app.html                               │  │   │
│  │  │  - Structure HTML DSFR                         │  │   │
│  │  │  - Chargement des bibliothèques externes       │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  widget-app.js (ReactApp class)                │  │   │
│  │  │  - Authentification via AuthLink               │  │   │
│  │  │  - Chargement dynamique des composants         │  │   │
│  │  │  - Transformation JSX avec Babel               │  │   │
│  │  │  - Navigation entre les pages                  │  │   │
│  │  │  - Communication avec Grist API                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Fonctionnalités principales

- **Composants React stockés dans Grist** : Le code JSX des composants est stocké directement dans la table `Application_Composants` et compilé à la volée avec Babel
- **Authentification basée sur ACL** : Système d'authentification via tokens utilisant les contrôles d'accès au niveau des lignes Grist
- **Navigation dynamique** : Système de routing côté client basé sur les IDs de composants
- **UI configurable** : En-tête, pied de page et navigation configurables via les tables Grist
- **Design System DSFR** : Intégration complète du système de design du gouvernement français
- **Bibliothèques externes** : React 18, Leaflet pour les cartes, et autres bibliothèques chargées dynamiquement

## Tables Grist du widget

### Application_Composants

Stocke le code source React de chaque page/composant de l'application.

**Colonnes principales** :
- `id` : Identifiant unique du composant (utilisé pour la navigation)
- `nom` : Nom descriptif du composant
- `code` : Code source JSX/React du composant
- `requires_auth` : Booléen indiquant si l'authentification est requise
- `shared` : Booléen indiquant si c'est un composant partagé/réutilisable

**Utilisation** :
```javascript
// Navigation vers un composant
navigate('beneficiaire-profil'); // id du composant

// Le widget charge le code depuis Application_Composants
// et le compile avec Babel avant de l'exécuter
```

### Application_Header

Configure l'en-tête de l'application.

**Colonnes** :
- `logo_url` : URL du logo à afficher
- `logo_alt` : Texte alternatif pour le logo
- `title` : Titre principal de l'application
- `service_tagline` : Sous-titre/tagline du service
- `quick_access_links` : Liens d'accès rapide (JSON)

**Structure** : Table avec une seule ligne de configuration

### Application_Footer

Configure le pied de page de l'application.

**Colonnes** :
- `brand_content` : Contenu HTML de la section marque
- `content_description` : Description du contenu
- `links` : Liens du footer (Reference vers Application_Liens)

**Structure** : Table avec une seule ligne de configuration

### Application_Liens

Stocke les liens de navigation (menu, footer, etc.).

**Colonnes** :
- `label` : Texte du lien
- `href` : URL ou ID de composant
- `icon` : Classe d'icône (optionnel)
- `requires_auth` : Si le lien nécessite une authentification
- `roles` : Rôles autorisés à voir ce lien (ChoiceList)
- `position` : Position d'affichage (menu, footer, etc.)

### AuthLink

Gère l'authentification et le contrôle d'accès basé sur les rôles.

**Colonnes principales** :
- `id` : Identifiant unique
- `Email` : Email de l'utilisateur (unique)
- `token` : Token d'authentification (UUID)
- `created_at` : Date de création
- `expires_at` : Date d'expiration du token
- `Beneficiaire` : Reference vers la table Beneficiaire (optionnel)
- `Acheteur` : Reference vers la table Acheteur (optionnel)
- `Repondant` : Reference vers la table Repondant (optionnel)

**Système de rôles** :
L'utilisateur a un rôle en fonction de la colonne de référence remplie :
- Si `Beneficiaire` est rempli → rôle "beneficiaire"
- Si `Acheteur` est rempli → rôle "acheteur"
- Si `Repondant` est rempli → rôle "repondant"

**Fonctionnement** :
1. Le token est passé dans l'URL du widget : `?token=xxx`
2. Le widget utilise ce token pour filtrer les données via ACL Grist
3. Chaque utilisateur ne voit que ses propres données selon les règles ACL

### Tables complémentaires

- **Application_FAQ_Categories** : Catégories de la FAQ
- **Application_FAQ_Questions** : Questions et réponses de la FAQ
- **Application_Env** : Variables d'environnement (API keys, URLs, etc.)
- **Application_AI_Conversations** : Conversations IA (si fonctionnalité activée)
- **Application_AI_Messages** : Messages des conversations IA
- **AuthUser** : Comptes utilisateurs (pour login classique si activé)
- **Application_Password_Reset** : Gestion des réinitialisations de mot de passe

## Architecture technique du widget

### Classe ReactApp

La classe principale `ReactApp` dans [widget-app.js](widget-app.js) gère tout le cycle de vie du widget.

**Méthodes principales** :

#### `constructor()`
Initialise le widget, configure Grist Plugin API, et charge la configuration.

#### `async init()`
Point d'entrée principal :
1. Vérifie l'authentification via le token URL
2. Charge la configuration (header, footer, liens)
3. Affiche la page d'accueil ou la page demandée via `?page=xxx`

#### `async checkAuth()`
Gère l'authentification :
```javascript
// Récupère le token depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Charge les données AuthLink correspondantes
const authData = await grist.docApi.fetchTable('AuthLink');
// Détermine le rôle utilisateur (beneficiaire, acheteur, repondant)
// Stocke les infos dans this.currentUser
```

#### `async loadComponent(componentId)`
Charge et exécute un composant dynamiquement :
1. Récupère le code depuis `Application_Composants`
2. Vérifie les permissions (`requires_auth`, rôles)
3. Transforme le JSX en JavaScript avec Babel
4. Crée et exécute une fonction JavaScript dynamique
5. Rend le composant React dans le conteneur

**Exemple de transformation** :
```javascript
// Code stocké dans Grist (JSX)
const code = `
function MonComposant() {
  const [count, setCount] = React.useState(0);
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}
`;

// Transformation Babel
const transformed = Babel.transform(code, {
  presets: ['react'],
  filename: 'component.jsx'
}).code;

// Exécution
const component = new Function('React', 'gristAPI', transformed);
const result = component(React, gristAPI);
```

#### `navigate(componentId, params)`
Navigation entre les composants :
```javascript
// Navigation simple
app.navigate('beneficiaire-profil');

// Navigation avec paramètres
app.navigate('marche-details', { id: 123 });

// Le paramètre page est mis à jour dans l'URL
// window.history.pushState pour navigation SPA
```

#### `createGristAPI()`
Crée l'objet API exposé aux composants :
```javascript
const gristAPI = {
  // Helpers React
  React: React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,

  // Leaflet pour les cartes
  L: L,

  // Données utilisateur
  currentUser: this.currentUser,
  isAuthenticated: !!this.currentUser,

  // Navigation
  navigate: (id, params) => this.navigate(id, params),

  // Accès données Grist
  getData: (tableId) => grist.docApi.fetchTable(tableId),

  // CRUD operations
  addRecord: (tableId, record) => grist.docApi.applyUserActions([
    ['AddRecord', tableId, null, record]
  ]),

  updateRecord: (tableId, rowId, record) => grist.docApi.applyUserActions([
    ['UpdateRecord', tableId, rowId, record]
  ]),

  deleteRecord: (tableId, rowId) => grist.docApi.applyUserActions([
    ['RemoveRecord', tableId, rowId]
  ]),

  // Environnement
  getEnv: (key) => this.env[key],

  // Composants partagés
  loadSharedComponent: (id) => this.loadSharedComponent(id)
};
```

### Cycle de vie d'un composant

```
1. Navigation → navigate('beneficiaire-profil')
                     ↓
2. Chargement → loadComponent('beneficiaire-profil')
                     ↓
3. Vérification → Check requires_auth, roles
                     ↓
4. Récupération → Fetch code from Application_Composants
                     ↓
5. Transformation → Babel transforms JSX to JS
                     ↓
6. Exécution → new Function() creates component
                     ↓
7. Rendu → ReactDOM.render() displays component
                     ↓
8. Interaction → Component uses gristAPI for data operations
```

### Communication avec Grist

Le widget utilise [grist-plugin-api](https://github.com/gristlabs/grist-plugin-api) pour communiquer avec Grist.

**Opérations disponibles** :

```javascript
// Lecture de table complète
const data = await grist.docApi.fetchTable('Beneficiaire');

// Lecture de lignes spécifiques via SQL
const filtered = await grist.docApi.fetchQuery({
  tableId: 'Marche',
  filters: { statut: ['En cours'] }
});

// Ajout d'enregistrement
await grist.docApi.applyUserActions([
  ['AddRecord', 'Beneficiaire', null, {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com'
  }]
]);

// Mise à jour d'enregistrement
await grist.docApi.applyUserActions([
  ['UpdateRecord', 'Beneficiaire', rowId, {
    telephone: '0123456789'
  }]
]);

// Suppression d'enregistrement
await grist.docApi.applyUserActions([
  ['RemoveRecord', 'Beneficiaire', rowId]
]);

// Actions multiples (transaction)
await grist.docApi.applyUserActions([
  ['AddRecord', 'TableA', null, { field: 'value1' }],
  ['UpdateRecord', 'TableB', 5, { field: 'value2' }],
  ['RemoveRecord', 'TableC', 10]
]);
```

### Gestion des attachments

Pour les colonnes de type Attachment (fichiers), Grist utilise un format spécial :

```javascript
// Format des attachments dans Grist
// Les IDs sont des nombres dans un array avec sentinelle 'L'
['L', 123, 456] // Deux fichiers avec IDs 123 et 456

// Upload de CV (exemple du composant beneficiaire-profil)
const uploadCV = async (file) => {
  // 1. Upload vers serveur externe via n8n
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(uploadURL, {
    method: 'POST',
    body: formData
  });

  const { attachmentId } = await response.json();

  // 2. Mise à jour de la colonne Attachment dans Grist
  // Important : format ReferenceList avec 'L' et IDs numériques uniquement
  const currentIds = form.curriculum_vitae || [];
  const cleanIds = currentIds
    .filter(v => v !== 'L' && v !== null && v !== undefined)
    .map(v => typeof v === 'number' ? v : Number(v))
    .filter(v => Number.isFinite(v));

  await updateRecord('Beneficiaire', beneficiaireId, {
    curriculum_vitae: ['L', ...cleanIds, attachmentId]
  });
};
```

## Système de navigation et routage

### URLs et paramètres

Le widget supporte plusieurs paramètres d'URL :

```
https://grist.example.com/widget.html?token=xxx&page=beneficiaire-profil&id=123

Paramètres :
- token : Token d'authentification (obligatoire pour pages protégées)
- page : ID du composant à afficher
- id : Paramètre custom passé au composant (optionnel)
- ... : Autres paramètres custom
```

### Navigation programmatique

```javascript
// Dans un composant, utiliser gristAPI.navigate()

// Navigation simple
<button onClick={() => gristAPI.navigate('beneficiaire-home')}>
  Accueil
</button>

// Navigation avec paramètres
<button onClick={() => gristAPI.navigate('marche-details', { id: row.id })}>
  Voir le marché
</button>

// Navigation avec état
const openModal = (data) => {
  // Stocker temporairement les données
  sessionStorage.setItem('modalData', JSON.stringify(data));
  gristAPI.navigate('marche-details');
};
```

### Pages d'accueil par rôle

Le widget définit des pages d'accueil différentes selon le rôle utilisateur :

```javascript
// Mapping rôle → page d'accueil (dans ReactApp.init)
const landingPages = {
  'beneficiaire': 'beneficiaire-home',
  'acheteur': 'acheteur-home',
  'repondant': 'repondant-home'
};

// Si aucune page demandée, redirection vers la landing page du rôle
if (!requestedPage) {
  const role = this.currentUser.role;
  this.navigate(landingPages[role] || 'home');
}
```

## Composants partagés

Certains composants sont marqués comme `shared: true` et peuvent être réutilisés dans d'autres composants.

**Création d'un composant partagé** :

```javascript
// Dans Application_Composants
// id: 'shared-modal', shared: true, code:
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="fr-modal" onClick={onClose}>
      <div className="fr-modal__body">
        {children}
      </div>
    </div>
  );
}
```

**Utilisation dans un autre composant** :

```javascript
function MaPage() {
  const [modalOpen, setModalOpen] = React.useState(false);

  // Charger le composant partagé
  const Modal = gristAPI.loadSharedComponent('shared-modal');

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>Ouvrir</button>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <p>Contenu de la modale</p>
      </Modal>
    </div>
  );
}
```

## Intégration DSFR

Le widget est entièrement compatible avec le Système de Design de l'État Français.

**Classes CSS DSFR disponibles** :
- Grille : `fr-grid-row`, `fr-col-*`
- Boutons : `fr-btn`, `fr-btn--secondary`, `fr-btn--icon-left`
- Cartes : `fr-card`, `fr-card__body`, `fr-card__title`
- Formulaires : `fr-input`, `fr-select`, `fr-checkbox-group`
- Navigation : `fr-nav`, `fr-nav__item`, `fr-nav__link`
- Modales : `fr-modal`, `fr-modal__body`
- Alertes : `fr-alert`, `fr-alert--info`, `fr-alert--error`
- Et bien d'autres...

**Exemple d'utilisation** :

```javascript
function FormulaireContact() {
  const [form, setForm] = React.useState({ nom: '', email: '' });

  return (
    <div className="fr-container">
      <div className="fr-grid-row">
        <div className="fr-col-12 fr-col-md-6">
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="nom">Nom</label>
            <input
              className="fr-input"
              type="text"
              id="nom"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
        </div>
      </div>
      <button className="fr-btn">Envoyer</button>
    </div>
  );
}
```

## Outil de synchronisation

Le fichier [tools/grist_sync.py](tools/grist_sync.py) permet de synchroniser les composants entre les fichiers locaux et Grist.

**Utilisation** :

```bash
# Push un composant local vers Grist
python tools/grist_sync.py push beneficiaire-profil

# Afficher les différences
python tools/grist_sync.py diff beneficiaire-profil

# Pull un composant depuis Grist
python tools/grist_sync.py pull beneficiaire-profil
```

**Configuration** :
Le script nécessite les variables d'environnement :
- `GRIST_API_KEY` : Clé API Grist
- `GRIST_DOC_ID` : ID du document Grist
- `GRIST_SERVER` : URL du serveur Grist

## Workflow de développement

### 1. Développement local

```bash
# Éditer le composant localement
vim grist/page/beneficiaire-profil

# Tester les modifications dans un environnement local si besoin

# Afficher les différences avec Grist
python tools/grist_sync.py diff beneficiaire-profil

# Push vers Grist
python tools/grist_sync.py push beneficiaire-profil
```

### 2. Tests dans Grist

1. Ouvrir le document Grist
2. Naviguer vers le custom widget
3. Tester les modifications
4. Vérifier les logs de la console navigateur

### 3. Débogage

**Console du navigateur** :
```javascript
// Logs ajoutés automatiquement par le widget
console.log('[ReactApp] Loading component:', componentId);
console.log('[ReactApp] User authenticated:', currentUser);
console.error('[ReactApp] Error loading component:', error);
```

**Vérification des données** :
```javascript
// Dans un composant, inspecter les données
const data = await gristAPI.getData('Beneficiaire');
console.log('Beneficiaire data:', data);
```

**Erreurs courantes** :
- `#KeyError` : Colonne ReferenceList mal formatée (vérifier 'L' sentinel et IDs numériques)
- `#IndexError` : Attachments mal formatés (vérifier filtrage des valeurs nulles)
- `Component not found` : ID de composant incorrect dans `navigate()`
- `Unauthorized` : Token expiré ou ACL mal configuré

## Sécurité et ACL

### Contrôle d'accès au niveau des lignes

Grist utilise des règles ACL pour contrôler l'accès aux données :

```python
# Exemple de règle ACL pour Beneficiaire
# L'utilisateur ne voit que sa propre ligne
user.Access == 'owners' or
rec.id == user.AuthLink.Beneficiaire

# Exemple pour Marche (visible par bénéficiaires)
user.Access == 'owners' or
'beneficiaire' in user.AuthLink.roles
```

### Tokens d'authentification

- **Génération** : UUID v4 généré par n8n lors de l'inscription
- **Stockage** : Dans la table `AuthLink` avec `expires_at`
- **Validation** : Automatique via les règles ACL Grist
- **Expiration** : Configurable (par défaut 90 jours)

### Bonnes pratiques

1. **Ne jamais stocker de données sensibles** dans `Application_Env` en clair
2. **Valider les entrées utilisateur** côté serveur (n8n workflows)
3. **Utiliser HTTPS** pour toutes les communications
4. **Renouveler les tokens** régulièrement
5. **Logger les accès** pour audit de sécurité

## Exemples de composants

### Formulaire simple

```javascript
function MonFormulaire() {
  const { useState, useEffect } = gristAPI.React;
  const [form, setForm] = useState({ nom: '', email: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await gristAPI.addRecord('MaTable', form);
      alert('Enregistrement ajouté !');
      setForm({ nom: '', email: '' });
    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fr-container">
      <form onSubmit={handleSubmit}>
        <div className="fr-input-group">
          <label className="fr-label">Nom</label>
          <input
            className="fr-input"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            required
          />
        </div>
        <button className="fr-btn" disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
}
```

### Liste avec pagination

```javascript
function MaListe() {
  const { useState, useEffect } = gristAPI.React;
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      const result = await gristAPI.getData('MaTable');
      setData(result);
    };
    loadData();
  }, []);

  const paginatedData = data.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="fr-container">
      <ul>
        {paginatedData.map(row => (
          <li key={row.id}>{row.nom}</li>
        ))}
      </ul>
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>
        Précédent
      </button>
      <button onClick={() => setPage(page + 1)}
              disabled={page * itemsPerPage >= data.length}>
        Suivant
      </button>
    </div>
  );
}
```

### Carte Leaflet

```javascript
function MaCarte() {
  const { useEffect, useRef } = gristAPI.React;
  const mapRef = useRef(null);

  useEffect(() => {
    // Initialiser la carte
    const map = gristAPI.L.map('map').setView([46.603354, 1.888334], 6);

    // Ajouter le fond de carte
    gristAPI.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Charger les données et ajouter des markers
    const loadMarkers = async () => {
      const data = await gristAPI.getData('Lieux');
      data.forEach(row => {
        if (row.latitude && row.longitude) {
          gristAPI.L.marker([row.latitude, row.longitude])
            .addTo(map)
            .bindPopup(row.nom);
        }
      });
    };
    loadMarkers();

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return <div id="map" style={{ height: '500px' }}></div>;
}
```

## Limitations et considérations

### Limitations techniques

1. **Taille des composants** : Les composants très volumineux peuvent ralentir le chargement (Babel transformation)
2. **Rafraîchissement temps réel** : Les données ne se mettent pas à jour automatiquement, nécessite un rechargement
3. **Bibliothèques externes** : Limitées à celles chargées dans widget-app.html
4. **Sandbox iframe** : Certaines fonctionnalités navigateur peuvent être restreintes

### Performance

- **Mise en cache** : Les composants sont mis en cache après le premier chargement
- **Lazy loading** : Charger les données uniquement quand nécessaire
- **Pagination** : Toujours paginer les grandes listes
- **Debouncing** : Utiliser pour les recherches et filtres

### Maintenance

- **Versionning** : Utiliser git pour tracker les changements de composants
- **Documentation** : Documenter chaque composant dans son code
- **Tests** : Tester manuellement chaque modification dans Grist
- **Backup** : Sauvegarder régulièrement le document Grist

## Documentation détaillée

Ce README fournit une vue d'ensemble du widget. Pour une documentation technique complète, consultez :

### 📖 Documentation principale

- **[docs/00-index.md](docs/00-index.md)** - Table des matières complète
- **[docs/01-architecture.md](docs/01-architecture.md)** - Architecture détaillée du système
- **[docs/02-reactapp-class.md](docs/02-reactapp-class.md)** - Classe ReactApp et méthodes
- **[docs/03-component-lifecycle.md](docs/03-component-lifecycle.md)** - Cycle de vie des composants

### 🗃️ Tables Grist

- **[docs/11-application-composants.md](docs/11-application-composants.md)** - Table des composants React
- **[docs/12-authlink.md](docs/12-authlink.md)** - Système d'authentification
- **docs/13-configuration-tables.md** - Configuration (Header, Footer, Liens)
- **docs/14-support-tables.md** - Tables de support (FAQ, Env, etc.)

### 🔧 API et développement

- **[docs/21-gristapi-object.md](docs/21-gristapi-object.md)** - Objet gristAPI complet
- **docs/22-crud-operations.md** - Opérations CRUD détaillées
- **docs/50-development-workflow.md** - Workflow de développement
- **docs/51-grist-sync-tool.md** - Outil de synchronisation

### 🔒 Sécurité

- **docs/30-authentication-flow.md** - Flux d'authentification
- **docs/31-acl-rules.md** - Règles ACL Grist
- **docs/32-security-best-practices.md** - Bonnes pratiques de sécurité

## Ressources externes

- [Documentation Grist](https://support.getgrist.com/)
- [Grist Plugin API](https://github.com/gristlabs/grist-plugin-api)
- [Système de Design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)
- [React Documentation](https://react.dev/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Babel Documentation](https://babeljs.io/)
