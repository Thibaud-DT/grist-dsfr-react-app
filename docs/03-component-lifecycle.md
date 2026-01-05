# Cycle de vie des composants

## Vue d'ensemble

Les composants React dans le Custom Widget Grist suivent un cycle de vie particulier du fait qu'ils sont stockés sous forme de code JSX dans Grist et compilés dynamiquement.

## Diagramme du cycle de vie

```
┌─────────────────────────────────────────────────────────────┐
│                   NAVIGATION DÉCLENCHÉE                      │
│            gristAPI.navigate('mon-composant')                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              1. VÉRIFICATION DU CACHE                        │
│   componentCache.has('mon-composant') ?                      │
│        OUI → Utiliser version cachée (skip étapes 2-6)       │
│        NON → Continuer le chargement                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          2. RÉCUPÉRATION DEPUIS GRIST                        │
│   grist.docApi.fetchTable('Application_Composants')         │
│   WHERE id = 'mon-composant'                                 │
│   → Retourne: { id, nom, code, requires_auth, shared, ... } │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          3. VÉRIFICATION DES PERMISSIONS                     │
│   A. requires_auth ?                                         │
│      OUI + !currentUser → navigate('login')                  │
│      OUI + currentUser → Continuer                           │
│      NON → Continuer                                         │
│   B. allowed_roles ?                                         │
│      Vérifier currentUser.role in allowed_roles              │
│      NON autorisé → showError() + stop                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          4. TRANSFORMATION BABEL (JSX → JS)                  │
│   Babel.transform(code, {                                    │
│     presets: ['react'],                                      │
│     filename: 'mon-composant.jsx'                            │
│   })                                                          │
│   → Code JSX transformé en JavaScript pur                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│       5. CRÉATION FONCTION JAVASCRIPT DYNAMIQUE              │
│   const fn = new Function('React', 'gristAPI',               │
│     transformedCode + '\nreturn MyComponent;'                │
│   );                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          6. EXÉCUTION ET EXTRACTION DU COMPOSANT             │
│   const MyComponent = fn(React, gristAPI);                   │
│   → Obtention de la fonction/classe composant React          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          7. MISE EN CACHE                                    │
│   componentCache.set('mon-composant', {                      │
│     component: MyComponent,                                  │
│     code, transformed, timestamp                             │
│   })                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          8. UNMOUNT DU COMPOSANT PRÉCÉDENT                   │
│   ReactDOM.unmountComponentAtNode(container)                 │
│   → Nettoyage du composant précédent                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          9. RENDU DU NOUVEAU COMPOSANT                       │
│   ReactDOM.render(                                           │
│     React.createElement(MyComponent),                        │
│     document.getElementById('app-content')                   │
│   )                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          10. EXÉCUTION DU COMPOSANT REACT                    │
│   - constructor() [si classe]                                │
│   - Appel de la fonction [si fonction]                       │
│   - Hooks React (useState, useEffect, etc.)                  │
│   - Retour du JSX                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          11. RECONCILIATION ET AFFICHAGE                     │
│   React compare le Virtual DOM avec le DOM réel              │
│   et applique les modifications nécessaires                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          12. HOOKS useEffect EXÉCUTÉS                        │
│   Les effets de bord sont exécutés après le premier rendu    │
│   - Chargement de données (gristAPI.getData)                 │
│   - Initialisation de cartes Leaflet                         │
│   - Abonnements à des événements                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             COMPOSANT ACTIF ET INTERACTIF                    │
│   - Réagit aux interactions utilisateur                      │
│   - Peut appeler gristAPI pour CRUD opérations               │
│   - Peut naviguer vers d'autres composants                   │
│   - Hooks useEffect se réexécutent selon dépendances         │
└─────────────────────────────────────────────────────────────┘
```

## Phases détaillées

### Phase 1 : Navigation

**Déclencheurs possibles** :
```javascript
// Navigation programmatique depuis un composant
gristAPI.navigate('beneficiaire-profil');

// Clic sur un lien de navigation
<a href="#" onClick={() => gristAPI.navigate('home')}>Accueil</a>

// Navigation browser (boutons précédent/suivant)
window.addEventListener('popstate', (event) => {
  const componentId = event.state.componentId;
  app.loadComponent(componentId);
});

// Chargement initial
await app.init(); // Charge le premier composant
```

### Phase 2-3 : Chargement et permissions

**Récupération du code** :
```javascript
// Le widget fetch la table Application_Composants
const componentsData = await grist.docApi.fetchTable('Application_Composants');

// Filtre pour trouver le composant demandé
const componentRow = componentsData.find(row => row.id === 'mon-composant');

// Structure du componentRow :
{
  id: 'mon-composant',
  nom: 'Mon Composant',
  code: `
    function MonComposant() {
      const { useState } = gristAPI.React;
      const [count, setCount] = useState(0);
      return <div onClick={() => setCount(count + 1)}>{count}</div>;
    }
  `,
  requires_auth: true,
  allowed_roles: ['beneficiaire', 'acheteur'],
  shared: false
}
```

**Vérification des permissions** :
```javascript
// Authentification requise ?
if (componentRow.requires_auth && !app.currentUser) {
  app.navigate('login');
  return;
}

// Rôle autorisé ?
if (componentRow.allowed_roles && componentRow.allowed_roles.length > 0) {
  const userRole = app.currentUser?.role;
  if (!userRole || !componentRow.allowed_roles.includes(userRole)) {
    app.showError('Accès non autorisé');
    return;
  }
}
```

### Phase 4 : Transformation Babel

**Code source JSX** :
```javascript
function MonComposant() {
  const { useState, useEffect } = gristAPI.React;
  const [data, setData] = useState([]);

  useEffect(() => {
    gristAPI.getData('MaTable').then(setData);
  }, []);

  return (
    <div className="fr-container">
      <h1>Liste</h1>
      <ul>
        {data.map(row => <li key={row.id}>{row.nom}</li>)}
      </ul>
    </div>
  );
}
```

**Après transformation Babel** :
```javascript
"use strict";

function MonComposant() {
  var _gristAPI$React = gristAPI.React,
      useState = _gristAPI$React.useState,
      useEffect = _gristAPI$React.useEffect;

  var _useState = useState([]),
      data = _useState[0],
      setData = _useState[1];

  useEffect(function () {
    gristAPI.getData('MaTable').then(setData);
  }, []);

  return React.createElement(
    "div",
    { className: "fr-container" },
    React.createElement("h1", null, "Liste"),
    React.createElement(
      "ul",
      null,
      data.map(function (row) {
        return React.createElement("li", { key: row.id }, row.nom);
      })
    )
  );
}
```

### Phase 5-6 : Exécution dynamique

**Création de la fonction** :
```javascript
// Le code transformé est enveloppé dans une Function
const componentFunction = new Function(
  'React',           // Paramètre 1
  'gristAPI',        // Paramètre 2
  transformedCode + '\nreturn MonComposant;'  // Corps de la fonction
);

// Exécution avec les arguments React et gristAPI
const MonComposant = componentFunction(React, app.gristAPI);

// MonComposant est maintenant une fonction/classe React utilisable
```

**Pourquoi new Function ?**
- Permet d'exécuter du code JavaScript généré dynamiquement
- Isole le contexte d'exécution
- Permet d'injecter React et gristAPI
- Alternative sécurisée à eval()

### Phase 7 : Cache

**Stratégie de cache** :
```javascript
// Stockage dans un Map
app.componentCache.set('mon-composant', {
  component: MonComposant,        // Composant compilé
  code: originalCode,              // Code JSX original
  transformed: transformedCode,    // Code JS transformé
  timestamp: Date.now()            // Date de compilation
});

// Récupération
const cached = app.componentCache.get('mon-composant');
if (cached) {
  // Utiliser cached.component directement
  // Skip phases 2-6
}
```

**Invalidation du cache** :
```javascript
// Le cache est en mémoire, donc invalidé au reload de la page
// Pour forcer un rechargement :
app.componentCache.delete('mon-composant');
app.loadComponent('mon-composant'); // Recharge depuis Grist
```

### Phase 8-9 : Rendu React

**Unmount et render** :
```javascript
const container = document.getElementById('app-content');

// 1. Unmount du composant précédent
ReactDOM.unmountComponentAtNode(container);
// → Déclenche componentWillUnmount et cleanup des useEffect

// 2. Render du nouveau composant
ReactDOM.render(
  React.createElement(MonComposant),  // Création de l'élément React
  container                            // Conteneur DOM cible
);
```

### Phase 10-12 : Exécution React

**Ordre d'exécution des hooks** :
```javascript
function MonComposant() {
  // 1. Déclaration des états (useState)
  const [data, setData] = useState([]);      // État initial: []
  const [loading, setLoading] = useState(true);  // État initial: true

  // 2. Déclaration des refs (useRef)
  const mapRef = useRef(null);

  // 3. Déclaration des callbacks (useCallback)
  const handleClick = useCallback((id) => {
    gristAPI.navigate('details', { id });
  }, []);

  // 4. Déclaration des mémos (useMemo)
  const filteredData = useMemo(() => {
    return data.filter(row => row.active);
  }, [data]);

  // 5. Déclaration des effets (useEffect)
  useEffect(() => {
    // CET EFFET S'EXÉCUTE APRÈS LE PREMIER RENDU
    const loadData = async () => {
      setLoading(true);
      const result = await gristAPI.getData('MaTable');
      setData(result);
      setLoading(false);
    };
    loadData();
  }, []); // Dépendances vides = exécute une seule fois

  useEffect(() => {
    // CET EFFET S'EXÉCUTE APRÈS CHAQUE CHANGEMENT DE data
    console.log('Data updated:', data.length);
  }, [data]);

  // 6. Rendu du JSX
  return (
    <div>
      {loading ? <p>Chargement...</p> : <p>{data.length} éléments</p>}
    </div>
  );
}
```

**Timeline d'exécution** :
```
T0: MonComposant() appelé
T1: Tous les hooks déclarés (useState, useRef, useCallback, useMemo, useEffect)
T2: return JSX
T3: React crée le Virtual DOM
T4: React compare avec le DOM réel (reconciliation)
T5: React met à jour le DOM réel
T6: Affichage visible à l'utilisateur
T7: Les effets useEffect sont exécutés (après le rendu)
T8: setData() appelé dans useEffect → Nouveau rendu (retour à T1)
```

## Hooks React disponibles

### useState

```javascript
function MonComposant() {
  const { useState } = gristAPI.React;

  // Déclaration
  const [count, setCount] = useState(0);
  const [form, setForm] = useState({ nom: '', email: '' });

  // Mise à jour
  setCount(count + 1);
  setCount(prev => prev + 1); // Forme fonctionnelle (recommandée)

  setForm({ ...form, nom: 'Nouveau nom' });
  setForm(prev => ({ ...prev, nom: 'Nouveau nom' }));

  return <div>{count}</div>;
}
```

### useEffect

```javascript
function MonComposant() {
  const { useState, useEffect } = gristAPI.React;
  const [data, setData] = useState([]);

  // Effet sans dépendances (exécuté une seule fois)
  useEffect(() => {
    console.log('Composant monté');
    return () => console.log('Composant démonté');
  }, []);

  // Effet avec dépendances (réexécuté quand data change)
  useEffect(() => {
    console.log('Data changed:', data);
  }, [data]);

  // Effet avec cleanup
  useEffect(() => {
    const timer = setInterval(() => console.log('tick'), 1000);
    return () => clearInterval(timer); // Cleanup
  }, []);

  return <div>{data.length}</div>;
}
```

### useCallback

```javascript
function MonComposant() {
  const { useState, useCallback } = gristAPI.React;
  const [filter, setFilter] = useState('');

  // Callback mémorisé (évite recréation à chaque rendu)
  const handleSearch = useCallback((query) => {
    setFilter(query);
    gristAPI.getData('MaTable').then(data => {
      const filtered = data.filter(row => row.nom.includes(query));
      // ...
    });
  }, []); // Dépendances

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### useMemo

```javascript
function MonComposant() {
  const { useState, useMemo } = gristAPI.React;
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');

  // Calcul mémorisé (évite recalcul si data et filter n'ont pas changé)
  const filteredData = useMemo(() => {
    console.log('Filtering data...');
    return data.filter(row => row.nom.includes(filter));
  }, [data, filter]); // Recalculé seulement si data ou filter change

  return <div>{filteredData.length} résultats</div>;
}
```

### useRef

```javascript
function MonComposant() {
  const { useRef, useEffect } = gristAPI.React;

  // Ref pour accéder au DOM
  const inputRef = useRef(null);

  // Ref pour stocker une valeur mutable (ne déclenche pas de rendu)
  const countRef = useRef(0);

  useEffect(() => {
    // Focus sur l'input au montage
    inputRef.current.focus();
  }, []);

  const handleClick = () => {
    countRef.current += 1;
    console.log('Clicked:', countRef.current); // Ne déclenche pas de rendu
  };

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={handleClick}>Click</button>
    </div>
  );
}
```

## Cycle de vie des données

### Chargement initial

```javascript
function MaListe() {
  const { useState, useEffect } = gristAPI.React;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await gristAPI.getData('MaTable');
        setData(result);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <ul>
      {data.map(row => <li key={row.id}>{row.nom}</li>)}
    </ul>
  );
}
```

### Mise à jour

```javascript
function MonFormulaire() {
  const { useState } = gristAPI.React;
  const [form, setForm] = useState({ nom: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      await gristAPI.addRecord('MaTable', form);

      // Reset du formulaire après succès
      setForm({ nom: '', email: '' });
      alert('Enregistré !');

    } catch (err) {
      alert('Erreur: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={form.nom}
        onChange={(e) => setForm({ ...form, nom: e.target.value })}
      />
      <button disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}
```

### Rechargement

```javascript
function MaListe() {
  const { useState, useEffect, useCallback } = gristAPI.React;
  const [data, setData] = useState([]);
  const [refresh, setRefresh] = useState(0);

  // useCallback pour éviter recréation
  const loadData = useCallback(async () => {
    const result = await gristAPI.getData('MaTable');
    setData(result);
  }, []);

  // Charger au montage et à chaque refresh
  useEffect(() => {
    loadData();
  }, [refresh, loadData]);

  // Forcer un rechargement
  const handleRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div>
      <button onClick={handleRefresh}>Actualiser</button>
      <ul>
        {data.map(row => <li key={row.id}>{row.nom}</li>)}
      </ul>
    </div>
  );
}
```

## Cycle de vie des cartes Leaflet

Les cartes Leaflet nécessitent un cycle de vie spécial :

```javascript
function MaCarte() {
  const { useRef, useEffect } = gristAPI.React;
  const mapRef = useRef(null);
  const markersRef = useRef(null);

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    const L = gristAPI.L;

    // Créer la carte
    const map = L.map('map-container').setView([46.603354, 1.888334], 6);

    // Ajouter le fond de carte
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Stocker la référence
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    // Cleanup au démontage
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Dépendances vides = une seule fois

  // Mise à jour des markers quand les données changent
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    const L = gristAPI.L;
    const layer = markersRef.current;

    // Nettoyer les anciens markers
    layer.clearLayers();

    // Charger et afficher les nouveaux markers
    gristAPI.getData('Lieux').then(data => {
      data.forEach(row => {
        if (row.latitude && row.longitude) {
          L.marker([row.latitude, row.longitude])
            .addTo(layer)
            .bindPopup(row.nom);
        }
      });
    });
  }, [/* dépendances pour mise à jour */]);

  return <div id="map-container" style={{ height: '500px' }}></div>;
}
```

## Gestion des erreurs dans le cycle de vie

### Erreur lors du chargement

```javascript
// Dans ReactApp.loadComponent()
try {
  const transformed = Babel.transform(code, { presets: ['react'] });
} catch (error) {
  console.error('[ReactApp] Babel error:', error);
  this.showError(`Erreur de syntaxe dans le composant: ${error.message}`);
  return; // Stop le chargement
}
```

### Erreur lors du rendu

```javascript
// Dans ReactApp.renderComponent()
try {
  ReactDOM.render(React.createElement(ComponentClass), container);
} catch (error) {
  console.error('[ReactApp] Render error:', error);
  this.showError('Erreur lors de l\'affichage du composant');
}
```

### Erreur dans un composant

```javascript
function MonComposant() {
  const { useState, useEffect } = gristAPI.React;
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await gristAPI.getData('TableQuiExistePas');
        // ...
      } catch (err) {
        setError(err);
      }
    };
    loadData();
  }, []);

  if (error) {
    return (
      <div className="fr-alert fr-alert--error">
        <h3>Erreur</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return <div>Contenu normal</div>;
}
```

## Bonnes pratiques

### 1. Toujours nettoyer les effets

```javascript
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer); // ✅ Cleanup
}, []);

// ❌ Mauvais (pas de cleanup)
useEffect(() => {
  setInterval(() => {}, 1000);
}, []);
```

### 2. Utiliser les dépendances correctement

```javascript
// ✅ Bon
useEffect(() => {
  console.log(data);
}, [data]); // data dans les dépendances

// ❌ Mauvais (missing dependency)
useEffect(() => {
  console.log(data);
}, []); // data devrait être dans les dépendances
```

### 3. Éviter les chargements multiples

```javascript
// ✅ Bon
useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    const result = await gristAPI.getData('Table');
    if (!cancelled) {
      setData(result);
    }
  };

  loadData();

  return () => { cancelled = true; };
}, []);
```

### 4. Utiliser useMemo pour calculs coûteux

```javascript
// ✅ Bon
const filteredData = useMemo(() => {
  return data.filter(/* calcul complexe */);
}, [data]);

// ❌ Mauvais (recalcule à chaque rendu)
const filteredData = data.filter(/* calcul complexe */);
```

## Références

- [02-reactapp-class.md](02-reactapp-class.md) - Classe ReactApp
- [21-gristapi-object.md](21-gristapi-object.md) - API gristAPI
- [53-component-examples.md](53-component-examples.md) - Exemples de composants
- [71-react-hooks.md](71-react-hooks.md) - Guide détaillé des hooks
