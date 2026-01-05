# Objet gristAPI

## Vue d'ensemble

L'objet `gristAPI` est l'interface principale exposée aux composants React pour interagir avec Grist, React, et les fonctionnalités du widget. Il est créé par la méthode `createGristAPI()` de la classe ReactApp et injecté dans chaque composant lors de son exécution.

## Structure complète

```javascript
const gristAPI = {
  // === React et hooks ===
  React: React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,

  // === Bibliothèques externes ===
  L: window.L, // Leaflet pour les cartes

  // === Authentification ===
  currentUser: {
    id: 123,
    email: 'user@example.com',
    token: 'uuid-token',
    role: 'beneficiaire',
    beneficiaire_id: 456,
    acheteur_id: null,
    repondant_id: null,
    expires_at: '2026-04-05T...',
    created_at: '2026-01-05T...'
  },
  isAuthenticated: true,

  // === Navigation ===
  navigate: (componentId, params) => { /* ... */ },

  // === Opérations sur les données ===
  getData: (tableId) => { /* ... */ },
  addRecord: (tableId, record) => { /* ... */ },
  updateRecord: (tableId, rowId, record) => { /* ... */ },
  deleteRecord: (tableId, rowId) => { /* ... */ },

  // === Environnement ===
  getEnv: (key) => { /* ... */ },

  // === Composants partagés ===
  loadSharedComponent: (componentId) => { /* ... */ }
};
```

## Propriétés

### React et hooks

#### `React`

L'objet React complet (React 18).

```javascript
const gristAPI = {
  React: React
};

// Utilisation dans un composant
function MonComposant() {
  const { React } = gristAPI;

  // Création d'éléments
  const element = React.createElement('div', null, 'Hello');

  // Fragments
  return React.createElement(React.Fragment, null, [
    React.createElement('p', { key: '1' }, 'Paragraph 1'),
    React.createElement('p', { key: '2' }, 'Paragraph 2')
  ]);
}
```

**Note** : En JSX, React est déjà disponible globalement après transformation Babel.

#### `useState`

Hook pour gérer l'état local.

```javascript
function MonComposant() {
  const { useState } = gristAPI.React;

  const [count, setCount] = useState(0);
  const [form, setForm] = useState({ nom: '', email: '' });
  const [items, setItems] = useState([]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(prev => prev + 1)}>+ (functional)</button>
    </div>
  );
}
```

#### `useEffect`

Hook pour effets de bord (chargement de données, abonnements, etc.).

```javascript
function MonComposant() {
  const { useState, useEffect } = gristAPI.React;
  const [data, setData] = useState([]);

  // Effet au montage uniquement
  useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);

  // Effet avec dépendances
  useEffect(() => {
    console.log('Data changed:', data);
  }, [data]);

  // Effet avec chargement de données
  useEffect(() => {
    const loadData = async () => {
      const result = await gristAPI.getData('MaTable');
      setData(result);
    };
    loadData();
  }, []);

  return <div>{data.length} items</div>;
}
```

#### `useCallback`

Hook pour mémoriser des callbacks.

```javascript
function MonComposant() {
  const { useState, useCallback } = gristAPI.React;
  const [filter, setFilter] = useState('');

  // Callback mémorisé
  const handleSearch = useCallback((query) => {
    console.log('Searching:', query);
    setFilter(query);
  }, []); // Se recrée seulement si les dépendances changent

  // Sans useCallback, se recrée à chaque rendu
  const handleSearchNotMemoized = (query) => {
    console.log('Searching:', query);
    setFilter(query);
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

#### `useMemo`

Hook pour mémoriser des calculs coûteux.

```javascript
function MonComposant() {
  const { useState, useMemo } = gristAPI.React;
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');

  // Calcul mémorisé
  const filteredData = useMemo(() => {
    console.log('Filtering data...');
    return data.filter(item => item.nom.includes(filter));
  }, [data, filter]); // Recalculé seulement si data ou filter change

  // Sans useMemo, recalculé à chaque rendu
  const filteredDataNotMemoized = data.filter(item => item.nom.includes(filter));

  return <div>{filteredData.length} results</div>;
}
```

#### `useRef`

Hook pour références mutables et accès au DOM.

```javascript
function MonComposant() {
  const { useRef, useEffect } = gristAPI.React;

  // Ref pour le DOM
  const inputRef = useRef(null);

  // Ref pour valeur mutable (ne déclenche pas de rendu)
  const countRef = useRef(0);

  useEffect(() => {
    // Focus sur l'input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleClick = () => {
    countRef.current += 1;
    console.log('Clicks:', countRef.current); // Ne déclenche pas de rendu
  };

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={handleClick}>Click (no render)</button>
    </div>
  );
}
```

### Bibliothèques externes

#### `L` (Leaflet)

Objet Leaflet pour créer des cartes interactives.

```javascript
function MaCarte() {
  const { useRef, useEffect } = gristAPI.React;
  const { L } = gristAPI;
  const mapRef = useRef(null);

  useEffect(() => {
    // Créer la carte
    const map = L.map('map-container').setView([46.603354, 1.888334], 6);

    // Ajouter le fond de carte
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Ajouter des markers
    L.marker([48.8566, 2.3522])
      .addTo(map)
      .bindPopup('Paris');

    L.marker([45.7640, 4.8357])
      .addTo(map)
      .bindPopup('Lyon');

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return <div id="map-container" style={{ height: '500px' }}></div>;
}
```

Voir [61-leaflet-maps.md](61-leaflet-maps.md) pour plus de détails.

### Authentification

#### `currentUser`

Informations sur l'utilisateur authentifié.

```javascript
const gristAPI = {
  currentUser: {
    id: 123,                          // ID dans AuthLink
    email: 'user@example.com',        // Email
    token: 'uuid-token',              // Token d'authentification
    role: 'beneficiaire',             // 'beneficiaire', 'acheteur', ou 'repondant'
    beneficiaire_id: 456,             // ID dans Beneficiaire (ou null)
    acheteur_id: null,                // ID dans Acheteur (ou null)
    repondant_id: null,               // ID dans Repondant (ou null)
    expires_at: '2026-04-05T...',    // Date d'expiration
    created_at: '2026-01-05T...'     // Date de création
  }
};

// Utilisation
function MonComposant() {
  const { currentUser } = gristAPI;

  if (!currentUser) {
    return <div>Veuillez vous connecter</div>;
  }

  return (
    <div>
      <h1>Bonjour {currentUser.email}</h1>
      <p>Rôle: {currentUser.role}</p>

      {currentUser.role === 'beneficiaire' && (
        <p>ID Bénéficiaire: {currentUser.beneficiaire_id}</p>
      )}
    </div>
  );
}
```

#### `isAuthenticated`

Boolean indiquant si l'utilisateur est authentifié.

```javascript
const gristAPI = {
  isAuthenticated: true  // true si currentUser !== null
};

// Utilisation
function MonComposant() {
  const { isAuthenticated } = gristAPI;

  if (!isAuthenticated) {
    return (
      <div className="fr-alert fr-alert--warning">
        <p>Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  return <div>Contenu protégé</div>;
}
```

## Méthodes

### `navigate(componentId, params)`

Navigue vers un autre composant.

**Paramètres** :
- `componentId` (string) : ID du composant cible (doit exister dans Application_Composants)
- `params` (object, optionnel) : Paramètres additionnels ajoutés à l'URL

**Retour** : `void`

```javascript
// Navigation simple
gristAPI.navigate('beneficiaire-home');

// Navigation avec paramètres
gristAPI.navigate('marche-details', { id: 123 });

// URL résultante
// ?token=xxx&page=marche-details&id=123

// Dans un composant
function MaListe() {
  const rows = [{ id: 1, nom: 'Item 1' }, { id: 2, nom: 'Item 2' }];

  return (
    <ul>
      {rows.map(row => (
        <li key={row.id}>
          {row.nom}
          <button onClick={() => gristAPI.navigate('details', { id: row.id })}>
            Voir
          </button>
        </li>
      ))}
    </ul>
  );
}

// Récupérer les paramètres dans le composant cible
function Details() {
  const { useEffect, useState } = gristAPI.React;
  const [data, setData] = useState(null);

  useEffect(() => {
    // Extraire l'ID depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      gristAPI.getData('MaTable').then(allData => {
        const row = allData.find(r => r.id === Number(id));
        setData(row);
      });
    }
  }, []);

  if (!data) return <div>Chargement...</div>;

  return <div><h1>{data.nom}</h1></div>;
}
```

### `getData(tableId)`

Récupère toutes les lignes d'une table.

**Paramètres** :
- `tableId` (string) : Nom de la table Grist

**Retour** : `Promise<Array<Object>>`

**Filtrage ACL** : Grist applique automatiquement les règles ACL. L'utilisateur ne voit que les lignes autorisées.

```javascript
// Récupération simple
const data = await gristAPI.getData('Beneficiaire');
console.log(data);
// [
//   { id: 1, Nom: 'Dupont', Prenom: 'Jean', Email: '...' },
//   { id: 2, Nom: 'Martin', Prenom: 'Marie', Email: '...' }
// ]

// Dans un composant
function MaListe() {
  const { useState, useEffect } = gristAPI.React;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await gristAPI.getData('MaTable');
        setItems(data);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.Nom}</li>
      ))}
    </ul>
  );
}
```

**Note** : Cette méthode charge TOUTES les lignes de la table (filtrées par ACL). Pour des tables volumineuses, considérez la pagination côté client.

### `addRecord(tableId, record)`

Ajoute un nouvel enregistrement à une table.

**Paramètres** :
- `tableId` (string) : Nom de la table
- `record` (object) : Données de l'enregistrement (noms de colonnes → valeurs)

**Retour** : `Promise<void>`

```javascript
// Ajout simple
await gristAPI.addRecord('Beneficiaire', {
  Nom: 'Nouveau',
  Prenom: 'Utilisateur',
  Email: 'nouveau@example.com',
  Telephone: '0123456789'
});

// Dans un formulaire
function FormulaireInscription() {
  const { useState } = gristAPI.React;
  const [form, setForm] = useState({ nom: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      await gristAPI.addRecord('Beneficiaire', {
        Nom: form.nom,
        Email: form.email
      });

      setMessage('Inscription réussie !');
      setForm({ nom: '', email: '' }); // Reset

    } catch (error) {
      setMessage('Erreur : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && <div className="fr-alert">{message}</div>}

      <input
        value={form.nom}
        onChange={(e) => setForm({ ...form, nom: e.target.value })}
        required
      />

      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />

      <button disabled={saving}>
        {saving ? 'Enregistrement...' : 'S\'inscrire'}
      </button>
    </form>
  );
}
```

**Types de colonnes** :
- Text: `{ ColonneText: 'valeur' }`
- Numeric: `{ ColonneNumeric: 123 }`
- Bool: `{ ColonneBool: true }`
- Date: `{ ColonneDate: new Date() }` ou `{ ColonneDate: '2026-01-05' }`
- DateTime: `{ ColonneDateTime: new Date() }`
- Reference: `{ ColonneRef: 456 }` (ID de l'enregistrement référencé)
- ReferenceList: `{ ColonneRefList: ['L', 1, 2, 3] }` (avec sentinelle 'L')
- Attachments: `{ ColonneAttachments: ['L', 789] }` (IDs des attachments)

### `updateRecord(tableId, rowId, record)`

Met à jour un enregistrement existant.

**Paramètres** :
- `tableId` (string) : Nom de la table
- `rowId` (number) : ID de la ligne à modifier
- `record` (object) : Champs à mettre à jour (seulement les champs modifiés)

**Retour** : `Promise<void>`

```javascript
// Mise à jour simple
await gristAPI.updateRecord('Beneficiaire', 123, {
  Telephone: '0987654321',
  Email: 'nouveau.email@example.com'
});

// Les autres champs ne sont pas modifiés

// Dans un formulaire d'édition
function FormulaireEdition({ beneficiaireId }) {
  const { useState, useEffect } = gristAPI.React;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Charger les données actuelles
  useEffect(() => {
    const loadData = async () => {
      const data = await gristAPI.getData('Beneficiaire');
      const record = data.find(r => r.id === beneficiaireId);

      if (record) {
        setForm({
          Nom: record.Nom,
          Prenom: record.Prenom,
          Email: record.Email,
          Telephone: record.Telephone
        });
      }

      setLoading(false);
    };

    loadData();
  }, [beneficiaireId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      await gristAPI.updateRecord('Beneficiaire', beneficiaireId, form);

      alert('Modifications enregistrées !');

    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={form.Nom}
        onChange={(e) => setForm({ ...form, Nom: e.target.value })}
      />
      <input
        value={form.Email}
        onChange={(e) => setForm({ ...form, Email: e.target.value })}
      />
      <button disabled={saving}>Enregistrer</button>
    </form>
  );
}
```

### `deleteRecord(tableId, rowId)`

Supprime un enregistrement.

**Paramètres** :
- `tableId` (string) : Nom de la table
- `rowId` (number) : ID de la ligne à supprimer

**Retour** : `Promise<void>`

```javascript
// Suppression simple
await gristAPI.deleteRecord('Beneficiaire', 123);

// Dans un composant avec confirmation
function ListeAvecSuppression() {
  const { useState, useEffect } = gristAPI.React;
  const [items, setItems] = useState([]);

  useEffect(() => {
    gristAPI.getData('MaTable').then(setItems);
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      return;
    }

    try {
      await gristAPI.deleteRecord('MaTable', id);

      // Mettre à jour l'état local
      setItems(items.filter(item => item.id !== id));

      alert('Élément supprimé');

    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.Nom}
          <button onClick={() => handleDelete(item.id)}>Supprimer</button>
        </li>
      ))}
    </ul>
  );
}
```

**Attention** : La suppression est définitive et irréversible (sauf backup Grist).

### `getEnv(key)`

Récupère une variable d'environnement.

**Paramètres** :
- `key` (string) : Clé de la variable dans la table Application_Env

**Retour** : `string | undefined`

```javascript
// Variables d'environnement stockées dans Application_Env
// | key                | value                              |
// |--------------------|-------------------------------------|
// | API_URL            | https://api.example.com             |
// | N8N_WEBHOOK_URL    | https://n8n.example.com/webhook/... |
// | UPLOAD_MAX_SIZE    | 5242880                             |

// Utilisation
const apiUrl = gristAPI.getEnv('API_URL');
console.log(apiUrl); // 'https://api.example.com'

const webhookUrl = gristAPI.getEnv('N8N_WEBHOOK_URL');
const maxSize = Number(gristAPI.getEnv('UPLOAD_MAX_SIZE'));

// Dans un composant
function UploadCV() {
  const uploadFile = async (file) => {
    const maxSize = Number(gristAPI.getEnv('UPLOAD_MAX_SIZE')) || 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert('Fichier trop volumineux');
      return;
    }

    const uploadUrl = gristAPI.getEnv('N8N_CV_UPLOAD_URL');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    // ...
  };

  return <input type="file" onChange={(e) => uploadFile(e.target.files[0])} />;
}
```

### `loadSharedComponent(componentId)`

Charge un composant partagé.

**Paramètres** :
- `componentId` (string) : ID du composant partagé (doit avoir `shared = true`)

**Retour** : `Promise<Function>` - Le composant React

```javascript
// Chargement et utilisation
function MaPage() {
  const { useState, useEffect } = gristAPI.React;
  const [Modal, setModal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    gristAPI.loadSharedComponent('shared-modal').then(setModal);
  }, []);

  if (!Modal) {
    return <div>Chargement du composant partagé...</div>;
  }

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>Ouvrir la modale</button>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ma modale"
      >
        <p>Contenu de la modale</p>
      </Modal>
    </div>
  );
}
```

Voir [72-shared-components.md](72-shared-components.md) pour plus de détails.

## Exemples complets

### Composant CRUD complet

```javascript
function GestionBeneficiaires() {
  const { React, getData, addRecord, updateRecord, deleteRecord } = gristAPI;
  const { useState, useEffect } = React;

  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ Nom: '', Email: '' });

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getData('Beneficiaire');
    setItems(data);
  };

  // Créer
  const handleCreate = async (e) => {
    e.preventDefault();
    await addRecord('Beneficiaire', form);
    setForm({ Nom: '', Email: '' });
    await loadData();
  };

  // Modifier
  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateRecord('Beneficiaire', editing.id, form);
    setEditing(null);
    setForm({ Nom: '', Email: '' });
    await loadData();
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (confirm('Supprimer ?')) {
      await deleteRecord('Beneficiaire', id);
      await loadData();
    }
  };

  // Éditer
  const startEdit = (item) => {
    setEditing(item);
    setForm({ Nom: item.Nom, Email: item.Email });
  };

  return (
    <div className="fr-container">
      <h1>Gestion des bénéficiaires</h1>

      {/* Formulaire */}
      <form onSubmit={editing ? handleUpdate : handleCreate}>
        <input
          placeholder="Nom"
          value={form.Nom}
          onChange={(e) => setForm({ ...form, Nom: e.target.value })}
        />
        <input
          placeholder="Email"
          value={form.Email}
          onChange={(e) => setForm({ ...form, Email: e.target.value })}
        />
        <button type="submit">
          {editing ? 'Modifier' : 'Créer'}
        </button>
        {editing && (
          <button type="button" onClick={() => {
            setEditing(null);
            setForm({ Nom: '', Email: '' });
          }}>
            Annuler
          </button>
        )}
      </form>

      {/* Liste */}
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.Nom} - {item.Email}
            <button onClick={() => startEdit(item)}>Éditer</button>
            <button onClick={() => handleDelete(item.id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Références

- [02-reactapp-class.md](02-reactapp-class.md) - Création de gristAPI
- [03-component-lifecycle.md](03-component-lifecycle.md) - Utilisation dans les composants
- [22-crud-operations.md](22-crud-operations.md) - Opérations CRUD détaillées
- [71-react-hooks.md](71-react-hooks.md) - Guide des hooks React
