# Classe ReactApp

## Vue d'ensemble

La classe `ReactApp` dans [widget-app.js](../widget-app.js) est le cœur du custom widget. Elle gère l'ensemble du cycle de vie de l'application, de l'initialisation à la navigation entre les composants.

## Structure de la classe

```javascript
class ReactApp {
  constructor() {
    // Initialisation des propriétés
    this.currentUser = null;
    this.grist = null;
    this.gristAPI = null;
    this.config = {};
    this.componentCache = new Map();
  }

  async init() { /* ... */ }
  async checkAuth() { /* ... */ }
  async loadHeader() { /* ... */ }
  async loadFooter() { /* ... */ }
  async loadNavigation() { /* ... */ }
  async loadComponent(componentId) { /* ... */ }
  navigate(componentId, params) { /* ... */ }
  createGristAPI() { /* ... */ }
  loadSharedComponent(componentId) { /* ... */ }
}
```

## Propriétés de l'instance

### `currentUser`

Objet contenant les informations de l'utilisateur authentifié :

```javascript
this.currentUser = {
  id: 123,                          // ID dans AuthLink
  email: 'user@example.com',        // Email
  token: 'uuid-token-string',       // Token d'authentification
  role: 'beneficiaire',             // Rôle déterminé ('beneficiaire', 'acheteur', 'repondant')
  beneficiaire_id: 456,             // ID dans la table Beneficiaire (ou null)
  acheteur_id: null,                // ID dans la table Acheteur (ou null)
  repondant_id: null,               // ID dans la table Repondant (ou null)
  expires_at: '2026-04-05T...',    // Date d'expiration du token
  created_at: '2026-01-05T...'     // Date de création
};
```

**Utilisation dans les composants** :
```javascript
function MonComposant() {
  const user = gristAPI.currentUser;

  if (user.role === 'beneficiaire') {
    // Afficher l'interface bénéficiaire
    const benefId = user.beneficiaire_id;
  }

  return <div>Bonjour {user.email}</div>;
}
```

### `grist`

Instance de l'API Grist Plugin obtenue via `grist.ready()` :

```javascript
this.grist = await grist.ready();

// Méthodes disponibles
this.grist.docApi.fetchTable(tableId)
this.grist.docApi.applyUserActions(actions)
this.grist.docApi.getAccessToken(options)
this.grist.onRecord(callback)
this.grist.onRecords(callback)
```

### `gristAPI`

Objet API exposé aux composants React (voir [21-gristapi-object.md](21-gristapi-object.md)) :

```javascript
this.gristAPI = {
  React: React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  L: window.L,
  currentUser: this.currentUser,
  isAuthenticated: !!this.currentUser,
  navigate: (id, params) => this.navigate(id, params),
  getData: (tableId) => this.grist.docApi.fetchTable(tableId),
  addRecord: (tableId, record) => { /* ... */ },
  updateRecord: (tableId, rowId, record) => { /* ... */ },
  deleteRecord: (tableId, rowId) => { /* ... */ },
  getEnv: (key) => this.config.env[key],
  loadSharedComponent: (id) => this.loadSharedComponent(id)
};
```

### `config`

Configuration chargée depuis les tables Grist :

```javascript
this.config = {
  header: {
    logo_url: '/path/to/logo.svg',
    logo_alt: 'Logo Eclauses',
    title: 'Eclauses',
    service_tagline: 'Clauses sociales dans les marchés publics'
  },
  footer: {
    brand_content: '<p>République Française</p>',
    content_description: 'Eclauses facilite...',
    links: [/* liens du footer */]
  },
  navigation: [
    { label: 'Accueil', href: 'beneficiaire-home', roles: ['beneficiaire'] },
    { label: 'Profil', href: 'beneficiaire-profil', roles: ['beneficiaire'] }
  ],
  env: {
    API_URL: 'https://...',
    N8N_WEBHOOK_URL: 'https://...',
    // Variables d'environnement
  }
};
```

### `componentCache`

Cache des composants déjà compilés pour éviter les transformations Babel répétées :

```javascript
this.componentCache = new Map();

// Stockage
this.componentCache.set('beneficiaire-profil', {
  component: BeneficiaireProfilComponent,
  code: '/* transformed code */',
  timestamp: Date.now()
});

// Récupération
const cached = this.componentCache.get('beneficiaire-profil');
if (cached) {
  return cached.component;
}
```

## Méthodes principales

### `constructor()`

Initialise les propriétés de base :

```javascript
constructor() {
  this.currentUser = null;
  this.grist = null;
  this.gristAPI = null;
  this.config = {
    header: {},
    footer: {},
    navigation: [],
    env: {}
  };
  this.componentCache = new Map();
  this.loadingComponent = false;

  console.log('[ReactApp] Constructor initialized');
}
```

**Appelé** : Une seule fois au chargement du script

### `async init()`

Point d'entrée principal de l'application :

```javascript
async init() {
  try {
    console.log('[ReactApp] Starting initialization...');

    // 1. Connexion à Grist
    this.grist = await grist.ready();
    console.log('[ReactApp] Grist API ready');

    // 2. Authentification
    await this.checkAuth();

    // 3. Chargement de la configuration
    await Promise.all([
      this.loadHeader(),
      this.loadFooter(),
      this.loadNavigation(),
      this.loadEnv()
    ]);

    // 4. Création de l'API exposée
    this.gristAPI = this.createGristAPI();

    // 5. Détermination de la page à afficher
    const urlParams = new URLSearchParams(window.location.search);
    const requestedPage = urlParams.get('page');

    let pageToLoad;
    if (requestedPage) {
      pageToLoad = requestedPage;
    } else if (this.currentUser) {
      // Page d'accueil selon le rôle
      const landingPages = {
        'beneficiaire': 'beneficiaire-home',
        'acheteur': 'acheteur-home',
        'repondant': 'repondant-home'
      };
      pageToLoad = landingPages[this.currentUser.role] || 'home';
    } else {
      // Page publique par défaut
      pageToLoad = 'home';
    }

    // 6. Chargement du composant initial
    await this.loadComponent(pageToLoad);

    // 7. Configuration de la navigation browser
    window.addEventListener('popstate', (event) => {
      const state = event.state;
      if (state && state.componentId) {
        this.loadComponent(state.componentId);
      }
    });

    console.log('[ReactApp] Initialization complete');

  } catch (error) {
    console.error('[ReactApp] Initialization error:', error);
    this.showError('Erreur lors du chargement de l\'application');
  }
}
```

**Appelé** : Une fois, au démarrage de l'application

**Dépendances** : `grist.ready()`

**Effets** :
- Connecte le widget à Grist
- Authentifie l'utilisateur
- Charge la configuration
- Affiche le composant initial
- Configure la navigation

### `async checkAuth()`

Vérifie et charge les informations d'authentification :

```javascript
async checkAuth() {
  try {
    console.log('[ReactApp] Checking authentication...');

    // 1. Récupération du token depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      console.log('[ReactApp] No token provided - anonymous access');
      this.currentUser = null;
      return;
    }

    // 2. Fetch de la table AuthLink
    // Grâce aux ACL, l'utilisateur ne voit que la ligne avec son token
    const authData = await this.grist.docApi.fetchTable('AuthLink');

    if (!authData || authData.length === 0) {
      console.warn('[ReactApp] Invalid or expired token');
      this.currentUser = null;
      return;
    }

    // 3. Extraction des données (première et unique ligne visible)
    const authRow = authData[0];

    // 4. Détermination du rôle
    let role = null;
    let beneficiaire_id = null;
    let acheteur_id = null;
    let repondant_id = null;

    if (authRow.Beneficiaire && authRow.Beneficiaire !== 0) {
      role = 'beneficiaire';
      beneficiaire_id = authRow.Beneficiaire;
    } else if (authRow.Acheteur && authRow.Acheteur !== 0) {
      role = 'acheteur';
      acheteur_id = authRow.Acheteur;
    } else if (authRow.Repondant && authRow.Repondant !== 0) {
      role = 'repondant';
      repondant_id = authRow.Repondant;
    }

    if (!role) {
      console.warn('[ReactApp] No role assigned to token');
      this.currentUser = null;
      return;
    }

    // 5. Vérification de l'expiration
    const expiresAt = new Date(authRow.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      console.warn('[ReactApp] Token expired');
      this.currentUser = null;
      return;
    }

    // 6. Stockage des informations utilisateur
    this.currentUser = {
      id: authRow.id,
      email: authRow.Email,
      token: token,
      role: role,
      beneficiaire_id: beneficiaire_id,
      acheteur_id: acheteur_id,
      repondant_id: repondant_id,
      expires_at: authRow.expires_at,
      created_at: authRow.created_at
    };

    console.log('[ReactApp] User authenticated:', {
      email: this.currentUser.email,
      role: this.currentUser.role
    });

  } catch (error) {
    console.error('[ReactApp] Authentication error:', error);
    this.currentUser = null;
  }
}
```

**Appelé** : Par `init()`

**Paramètres** : Aucun (lit l'URL directement)

**Retourne** : `void` (modifie `this.currentUser`)

**Règles ACL requises** :
```python
# Dans AuthLink
user.Access == 'owners' or rec.token == user.token
```

### `async loadComponent(componentId)`

Charge et affiche un composant React :

```javascript
async loadComponent(componentId) {
  // Éviter les chargements multiples simultanés
  if (this.loadingComponent) {
    console.warn('[ReactApp] Component already loading, skipping');
    return;
  }

  try {
    this.loadingComponent = true;
    console.log('[ReactApp] Loading component:', componentId);

    // 1. Vérifier le cache
    const cached = this.componentCache.get(componentId);
    if (cached) {
      console.log('[ReactApp] Using cached component');
      this.renderComponent(cached.component);
      return;
    }

    // 2. Fetch depuis Application_Composants
    const componentsData = await this.grist.docApi.fetchTable('Application_Composants');
    const componentRow = componentsData.find(row => row.id === componentId);

    if (!componentRow) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // 3. Vérification des permissions
    if (componentRow.requires_auth && !this.currentUser) {
      console.warn('[ReactApp] Authentication required for:', componentId);
      this.navigate('login');
      return;
    }

    // 4. Vérification du rôle (si spécifié)
    if (componentRow.allowed_roles && componentRow.allowed_roles.length > 0) {
      const userRole = this.currentUser?.role;
      if (!userRole || !componentRow.allowed_roles.includes(userRole)) {
        console.warn('[ReactApp] Access denied for role:', userRole);
        this.showError('Accès non autorisé à cette page');
        return;
      }
    }

    // 5. Transformation Babel (JSX → JS)
    const code = componentRow.code;
    console.log('[ReactApp] Transforming JSX with Babel...');

    const transformed = Babel.transform(code, {
      presets: ['react'],
      filename: `${componentId}.jsx`
    }).code;

    // 6. Création de la fonction JavaScript
    // Le code doit exporter le composant via "return MyComponent" ou window.MyComponent
    const componentFunction = new Function(
      'React',
      'gristAPI',
      transformed + '\nreturn typeof MyComponent !== "undefined" ? MyComponent : null;'
    );

    // 7. Exécution pour obtenir le composant
    const ComponentClass = componentFunction(React, this.gristAPI);

    if (!ComponentClass) {
      throw new Error(`Component ${componentId} did not export a component`);
    }

    // 8. Mise en cache
    this.componentCache.set(componentId, {
      component: ComponentClass,
      code: code,
      transformed: transformed,
      timestamp: Date.now()
    });

    // 9. Rendu
    this.renderComponent(ComponentClass);

    console.log('[ReactApp] Component loaded successfully');

  } catch (error) {
    console.error('[ReactApp] Error loading component:', error);
    this.showError(`Erreur lors du chargement du composant: ${error.message}`);
  } finally {
    this.loadingComponent = false;
  }
}
```

**Appelé** : Par `navigate()` ou lors de l'initialisation

**Paramètres** :
- `componentId` : ID du composant dans Application_Composants

**Processus** :
1. Vérification cache
2. Fetch du code depuis Grist
3. Vérification permissions (auth + rôle)
4. Transformation Babel JSX → JS
5. Création fonction JavaScript dynamique
6. Exécution pour obtenir le composant React
7. Mise en cache
8. Rendu avec ReactDOM

### `renderComponent(ComponentClass)`

Rend un composant React dans le DOM :

```javascript
renderComponent(ComponentClass) {
  const container = document.getElementById('app-content');

  if (!container) {
    console.error('[ReactApp] Container #app-content not found');
    return;
  }

  try {
    // Unmount du composant précédent
    ReactDOM.unmountComponentAtNode(container);

    // Render du nouveau composant
    ReactDOM.render(
      React.createElement(ComponentClass),
      container
    );

    console.log('[ReactApp] Component rendered');

  } catch (error) {
    console.error('[ReactApp] Render error:', error);
    this.showError('Erreur lors de l\'affichage du composant');
  }
}
```

### `navigate(componentId, params = {})`

Navigue vers un autre composant :

```javascript
navigate(componentId, params = {}) {
  console.log('[ReactApp] Navigating to:', componentId, params);

  // 1. Construction de l'URL
  const urlParams = new URLSearchParams(window.location.search);

  // Garder le token
  const token = urlParams.get('token');
  const newParams = new URLSearchParams();
  if (token) {
    newParams.set('token', token);
  }

  // Ajouter la page
  newParams.set('page', componentId);

  // Ajouter les paramètres custom
  Object.keys(params).forEach(key => {
    newParams.set(key, params[key]);
  });

  // 2. Mise à jour de l'historique
  const newUrl = `${window.location.pathname}?${newParams.toString()}`;
  window.history.pushState(
    { componentId, params },
    '',
    newUrl
  );

  // 3. Chargement du composant
  this.loadComponent(componentId);
}
```

**Appelé** : Par les composants via `gristAPI.navigate()`

**Paramètres** :
- `componentId` : ID du composant cible
- `params` : Objet de paramètres optionnels (ajoutés à l'URL)

**Exemple d'utilisation dans un composant** :
```javascript
function MaListe() {
  const handleClick = (id) => {
    gristAPI.navigate('details', { id: id });
  };

  return (
    <button onClick={() => handleClick(123)}>
      Voir les détails
    </button>
  );
}
```

### `createGristAPI()`

Crée l'objet API exposé aux composants :

```javascript
createGristAPI() {
  return {
    // React et hooks
    React: React,
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,

    // Leaflet pour les cartes
    L: window.L,

    // Utilisateur actuel
    currentUser: this.currentUser,
    isAuthenticated: !!this.currentUser,

    // Navigation
    navigate: (id, params) => this.navigate(id, params),

    // Lecture de données
    getData: (tableId) => {
      console.log('[gristAPI] getData:', tableId);
      return this.grist.docApi.fetchTable(tableId);
    },

    // Ajout d'enregistrement
    addRecord: (tableId, record) => {
      console.log('[gristAPI] addRecord:', tableId, record);
      return this.grist.docApi.applyUserActions([
        ['AddRecord', tableId, null, record]
      ]);
    },

    // Mise à jour d'enregistrement
    updateRecord: (tableId, rowId, record) => {
      console.log('[gristAPI] updateRecord:', tableId, rowId, record);
      return this.grist.docApi.applyUserActions([
        ['UpdateRecord', tableId, rowId, record]
      ]);
    },

    // Suppression d'enregistrement
    deleteRecord: (tableId, rowId) => {
      console.log('[gristAPI] deleteRecord:', tableId, rowId);
      return this.grist.docApi.applyUserActions([
        ['RemoveRecord', tableId, rowId]
      ]);
    },

    // Variables d'environnement
    getEnv: (key) => {
      return this.config.env[key];
    },

    // Composants partagés
    loadSharedComponent: (id) => {
      return this.loadSharedComponent(id);
    }
  };
}
```

**Appelé** : Par `init()` après authentification

**Retourne** : Objet API utilisable dans les composants

Voir [21-gristapi-object.md](21-gristapi-object.md) pour la documentation complète.

### `async loadSharedComponent(componentId)`

Charge un composant partagé réutilisable :

```javascript
async loadSharedComponent(componentId) {
  console.log('[ReactApp] Loading shared component:', componentId);

  // Vérifier le cache
  const cached = this.componentCache.get(componentId);
  if (cached) {
    return cached.component;
  }

  // Charger depuis Application_Composants
  const componentsData = await this.grist.docApi.fetchTable('Application_Composants');
  const componentRow = componentsData.find(
    row => row.id === componentId && row.shared === true
  );

  if (!componentRow) {
    throw new Error(`Shared component not found: ${componentId}`);
  }

  // Transformer et compiler
  const transformed = Babel.transform(componentRow.code, {
    presets: ['react'],
    filename: `${componentId}.jsx`
  }).code;

  const componentFunction = new Function(
    'React',
    'gristAPI',
    transformed + '\nreturn MyComponent;'
  );

  const ComponentClass = componentFunction(React, this.gristAPI);

  // Mettre en cache
  this.componentCache.set(componentId, {
    component: ComponentClass,
    code: componentRow.code,
    transformed: transformed,
    timestamp: Date.now()
  });

  return ComponentClass;
}
```

**Utilisation dans un composant** :
```javascript
function MaPage() {
  const [Modal, setModal] = React.useState(null);

  React.useEffect(() => {
    gristAPI.loadSharedComponent('shared-modal').then(setModal);
  }, []);

  if (!Modal) return <div>Loading...</div>;

  return (
    <div>
      <Modal isOpen={true}>Contenu</Modal>
    </div>
  );
}
```

## Méthodes utilitaires

### `showError(message)`

Affiche un message d'erreur à l'utilisateur :

```javascript
showError(message) {
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = `
    <div class="fr-container fr-mt-4w">
      <div class="fr-alert fr-alert--error">
        <h3 class="fr-alert__title">Erreur</h3>
        <p>${message}</p>
      </div>
    </div>
  `;
}
```

### `showLoading()`

Affiche un indicateur de chargement :

```javascript
showLoading() {
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = `
    <div class="fr-container fr-mt-4w" style="text-align: center;">
      <div class="fr-spinner" aria-label="Chargement en cours"></div>
      <p class="fr-mt-2w">Chargement...</p>
    </div>
  `;
}
```

## Gestion des erreurs

### Erreurs de chargement de composant

```javascript
try {
  await this.loadComponent(componentId);
} catch (error) {
  if (error.message.includes('Component not found')) {
    this.showError('Cette page n\'existe pas');
  } else if (error.message.includes('Authentication required')) {
    this.navigate('login');
  } else {
    this.showError('Une erreur est survenue lors du chargement de la page');
  }
  console.error('[ReactApp] Component error:', error);
}
```

### Erreurs d'authentification

```javascript
// Dans checkAuth()
catch (error) {
  console.error('[ReactApp] Authentication error:', error);
  this.currentUser = null;
  // L'application continue en mode non authentifié
}
```

### Erreurs Babel

```javascript
try {
  const transformed = Babel.transform(code, { presets: ['react'] });
} catch (error) {
  console.error('[ReactApp] Babel transformation error:', error);
  this.showError(`Erreur de syntaxe dans le composant: ${error.message}`);
}
```

## Logging et débogage

Le ReactApp log tous les événements importants :

```javascript
console.log('[ReactApp] Starting initialization...');
console.log('[ReactApp] Grist API ready');
console.log('[ReactApp] User authenticated:', { email, role });
console.log('[ReactApp] Loading component:', componentId);
console.log('[ReactApp] Using cached component');
console.log('[ReactApp] Transforming JSX with Babel...');
console.log('[ReactApp] Component loaded successfully');
console.log('[ReactApp] Navigating to:', componentId, params);

console.warn('[ReactApp] Invalid or expired token');
console.warn('[ReactApp] No role assigned to token');
console.warn('[ReactApp] Authentication required for:', componentId);
console.warn('[ReactApp] Component already loading, skipping');

console.error('[ReactApp] Initialization error:', error);
console.error('[ReactApp] Authentication error:', error);
console.error('[ReactApp] Error loading component:', error);
console.error('[ReactApp] Render error:', error);
```

**Pour activer plus de logs** :
```javascript
// Ajouter dans constructor()
this.debug = true;

// Utiliser dans les méthodes
if (this.debug) {
  console.debug('[ReactApp] Detailed info:', data);
}
```

## Références

- [03-component-lifecycle.md](03-component-lifecycle.md) - Cycle de vie des composants
- [21-gristapi-object.md](21-gristapi-object.md) - API exposée aux composants
- [30-authentication-flow.md](30-authentication-flow.md) - Flux d'authentification détaillé
- [70-babel-transformation.md](70-babel-transformation.md) - Transformation JSX
