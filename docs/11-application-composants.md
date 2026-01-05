# Table Application_Composants

## Vue d'ensemble

La table `Application_Composants` est le cœur du système de composants dynamiques. Elle stocke le code source JSX de chaque page/composant React de l'application.

## Schéma de la table

| Colonne | Type | Description | Obligatoire |
|---------|------|-------------|-------------|
| `id` | Text | Identifiant unique du composant (utilisé pour la navigation) | ✅ |
| `nom` | Text | Nom descriptif du composant (pour l'administration) | ✅ |
| `description` | Text | Description du rôle du composant | ❌ |
| `code` | Text | Code source JSX/React complet du composant | ✅ |
| `requires_auth` | Bool | Le composant nécessite-t-il une authentification ? | ✅ |
| `allowed_roles` | ChoiceList | Rôles autorisés à accéder au composant | ❌ |
| `shared` | Bool | Est-ce un composant partagé/réutilisable ? | ✅ |
| `category` | Choice | Catégorie (beneficiaire, acheteur, repondant, shared, public) | ❌ |
| `created_at` | DateTime | Date de création | ❌ |
| `updated_at` | DateTime | Dernière modification | ❌ |

## Détails des colonnes

### `id` (Text)

Identifiant unique utilisé pour la navigation et le chargement du composant.

**Conventions de nommage** :
- Format : `{role}-{page}` ou `{page}` pour les pages publiques
- Exemples : `beneficiaire-home`, `acheteur-marches`, `login`, `home`
- Utiliser des tirets (`-`) pour séparer les mots
- Éviter les espaces, accents, caractères spéciaux

**Exemples** :
```
beneficiaire-home
beneficiaire-profil
beneficiaire-marches
beneficiaire-annuaire
acheteur-home
acheteur-marches
acheteur-annuaire
repondant-home
repondant-marches
shared-modal
home
login
faq
```

**Utilisation dans la navigation** :
```javascript
// Navigation vers un composant
gristAPI.navigate('beneficiaire-profil');

// URL résultante
?token=xxx&page=beneficiaire-profil
```

### `nom` (Text)

Nom lisible du composant pour l'interface d'administration.

**Exemples** :
```
"Page d'accueil bénéficiaire"
"Profil du bénéficiaire"
"Liste des marchés"
"Annuaire des bénéficiaires"
"Modale partagée"
```

### `description` (Text)

Description détaillée du rôle et des fonctionnalités du composant.

**Exemple** :
```
"Page d'accueil du bénéficiaire avec statistiques personnelles,
marchés favoris, et accès rapide aux fonctionnalités principales."
```

### `code` (Text)

Code source JSX/React complet du composant.

**Structure minimale** :
```javascript
function MonComposant() {
  const { useState, useEffect } = gristAPI.React;

  return (
    <div className="fr-container">
      <h1>Mon Composant</h1>
    </div>
  );
}
```

**Structure recommandée** :
```javascript
// === Configuration et constantes ===
const TABLE_NAME = 'MaTable';
const COL_NOM = 'Nom';

// === Composant principal ===
function MonComposant() {
  // Déstructuration gristAPI
  const { React, currentUser, navigate, getData, updateRecord } = gristAPI;
  const { useState, useEffect, useCallback, useMemo } = React;

  // États
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effets
  useEffect(() => {
    loadData();
  }, []);

  // Fonctions
  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getData(TABLE_NAME);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rendu conditionnel
  if (loading) return <div className="fr-container">Chargement...</div>;
  if (error) return <div className="fr-alert fr-alert--error">{error}</div>;

  // Rendu principal
  return (
    <main className="fr-container fr-my-4w">
      <h1>Mon Composant</h1>
      {/* Contenu */}
    </main>
  );
}
```

**Règles importantes** :
1. Le composant doit être une fonction nommée
2. Utiliser `gristAPI` pour accéder à React, hooks, et API Grist
3. Suivre les conventions DSFR pour les classes CSS
4. Gérer les états de chargement et d'erreur
5. Nettoyer les effets dans useEffect

### `requires_auth` (Bool)

Indique si le composant nécessite une authentification.

**Valeurs** :
- `true` : L'utilisateur doit être authentifié (avoir un token valide)
- `false` : Le composant est accessible publiquement

**Comportement** :
```javascript
// Dans ReactApp.loadComponent()
if (componentRow.requires_auth && !this.currentUser) {
  // Redirection vers la page de login
  this.navigate('login');
  return;
}
```

**Exemples** :
| Composant | requires_auth | Raison |
|-----------|---------------|--------|
| `home` | `false` | Page d'accueil publique |
| `faq` | `false` | FAQ accessible à tous |
| `login` | `false` | Page de connexion |
| `beneficiaire-profil` | `true` | Données personnelles |
| `acheteur-marches` | `true` | Fonctionnalité métier |

### `allowed_roles` (ChoiceList)

Liste des rôles autorisés à accéder au composant.

**Valeurs possibles** :
- `beneficiaire`
- `acheteur`
- `repondant`

**Format Grist** :
```python
['L', 'beneficiaire', 'acheteur']  # Autoriser bénéficiaires et acheteurs
['L', 'beneficiaire']                # Autoriser uniquement bénéficiaires
[]                                    # Aucune restriction de rôle
```

**Comportement** :
```javascript
// Dans ReactApp.loadComponent()
if (componentRow.allowed_roles && componentRow.allowed_roles.length > 0) {
  const userRole = this.currentUser?.role;
  if (!userRole || !componentRow.allowed_roles.includes(userRole)) {
    this.showError('Accès non autorisé à cette page');
    return;
  }
}
```

**Exemples** :
| Composant | allowed_roles | Qui peut accéder |
|-----------|---------------|------------------|
| `beneficiaire-profil` | `['L', 'beneficiaire']` | Bénéficiaires uniquement |
| `acheteur-marches` | `['L', 'acheteur']` | Acheteurs uniquement |
| `faq` | `[]` | Tous (public) |
| `shared-modal` | `[]` | Tous (composant partagé) |

### `shared` (Bool)

Indique si le composant est partagé/réutilisable.

**Valeurs** :
- `true` : Composant partagé, chargé via `gristAPI.loadSharedComponent()`
- `false` : Composant page normal

**Composants partagés** :
Les composants partagés sont des composants réutilisables (modales, formulaires, cartes) qui peuvent être chargés dans d'autres composants.

**Création d'un composant partagé** :
```javascript
// Dans Application_Composants
// id: 'shared-modal', shared: true

function Modal({ isOpen, onClose, title, children }) {
  const { React } = gristAPI;

  if (!isOpen) return null;

  return (
    <div className="fr-modal" aria-labelledby="modal-title" role="dialog">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  className="fr-btn--close fr-btn"
                  aria-controls="modal"
                  onClick={onClose}
                >
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id="modal-title" className="fr-modal__title">
                  {title}
                </h1>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Utilisation dans un autre composant** :
```javascript
function MaPage() {
  const { React, loadSharedComponent } = gristAPI;
  const { useState, useEffect } = React;

  const [Modal, setModal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Charger le composant partagé
  useEffect(() => {
    loadSharedComponent('shared-modal').then(setModal);
  }, []);

  if (!Modal) return <div>Chargement...</div>;

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>Ouvrir</button>

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

### `category` (Choice)

Catégorie du composant pour organisation.

**Valeurs** :
- `beneficiaire` : Composants de l'espace bénéficiaire
- `acheteur` : Composants de l'espace acheteur
- `repondant` : Composants de l'espace répondant
- `shared` : Composants partagés
- `public` : Composants publics (home, login, faq)

## Exemples de composants

### Composant page simple

```javascript
// id: beneficiaire-home
// nom: Page d'accueil bénéficiaire
// requires_auth: true
// allowed_roles: ['L', 'beneficiaire']
// shared: false

function BeneficiaireHome() {
  const { React, currentUser, navigate } = gristAPI;

  return (
    <main className="fr-container fr-my-4w">
      <h1>Bienvenue {currentUser.email}</h1>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Mon profil</h2>
              <p className="fr-card__desc">Gérez vos informations personnelles</p>
              <button
                className="fr-btn"
                onClick={() => navigate('beneficiaire-profil')}
              >
                Accéder
              </button>
            </div>
          </div>
        </div>

        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card">
            <div className="fr-card__body">
              <h2 className="fr-card__title">Marchés</h2>
              <p className="fr-card__desc">Consultez les marchés disponibles</p>
              <button
                className="fr-btn"
                onClick={() => navigate('beneficiaire-marches')}
              >
                Accéder
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

### Composant avec chargement de données

```javascript
// id: beneficiaire-marches-liste
// nom: Liste des marchés pour bénéficiaires
// requires_auth: true
// allowed_roles: ['L', 'beneficiaire']
// shared: false

function BeneficiaireMarchesListe() {
  const { React, currentUser, getData, navigate } = gristAPI;
  const { useState, useEffect } = React;

  const [marches, setMarches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMarches = async () => {
      try {
        setLoading(true);
        const data = await getData('Marche');

        // Filtrer les marchés actifs
        const actifs = data.filter(m => m.Statut === 'Actif');
        setMarches(actifs);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMarches();
  }, []);

  if (loading) {
    return (
      <div className="fr-container fr-my-4w">
        <p>Chargement des marchés...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fr-container fr-my-4w">
        <div className="fr-alert fr-alert--error">
          <p>Erreur : {error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="fr-container fr-my-4w">
      <h1>Marchés disponibles</h1>
      <p className="fr-text--lead">{marches.length} marché(s) actif(s)</p>

      <div className="fr-grid-row fr-grid-row--gutters">
        {marches.map(marche => (
          <div key={marche.id} className="fr-col-12 fr-col-md-6">
            <div className="fr-card fr-card--horizontal">
              <div className="fr-card__body">
                <h2 className="fr-card__title">{marche.Nom}</h2>
                <p className="fr-card__desc">{marche.Description}</p>
                <p className="fr-text--sm">
                  <strong>Acheteur :</strong> {marche.Acheteur_nom}
                </p>
                <p className="fr-text--sm">
                  <strong>Date limite :</strong> {new Date(marche.DLRO).toLocaleDateString()}
                </p>
                <button
                  className="fr-btn fr-btn--sm"
                  onClick={() => navigate('marche-details', { id: marche.id })}
                >
                  Voir les détails
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {marches.length === 0 && (
        <div className="fr-alert fr-alert--info">
          <p>Aucun marché disponible pour le moment.</p>
        </div>
      )}
    </main>
  );
}
```

### Composant avec formulaire

```javascript
// id: beneficiaire-profil
// nom: Formulaire de profil bénéficiaire
// requires_auth: true
// allowed_roles: ['L', 'beneficiaire']
// shared: false

function BeneficiaireProfil() {
  const { React, currentUser, getData, updateRecord } = gristAPI;
  const { useState, useEffect } = React;

  const [form, setForm] = useState({
    Nom: '',
    Prenom: '',
    Email: '',
    Telephone: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Charger le profil
  useEffect(() => {
    const loadProfil = async () => {
      try {
        const data = await getData('Beneficiaire');
        const profil = data.find(b => b.id === currentUser.beneficiaire_id);

        if (profil) {
          setForm({
            Nom: profil.Nom || '',
            Prenom: profil.Prenom || '',
            Email: profil.Email || '',
            Telephone: profil.Telephone || ''
          });
        }
      } catch (err) {
        setMessage('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadProfil();
  }, []);

  // Enregistrer le profil
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage('');

      await updateRecord('Beneficiaire', currentUser.beneficiaire_id, form);

      setMessage('Profil enregistré avec succès !');
    } catch (err) {
      setMessage('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="fr-container">Chargement...</div>;

  return (
    <main className="fr-container fr-my-4w">
      <h1>Mon profil</h1>

      {message && (
        <div className={`fr-alert ${message.includes('succès') ? 'fr-alert--success' : 'fr-alert--error'}`}>
          <p>{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="fr-input-group">
          <label className="fr-label" htmlFor="nom">Nom</label>
          <input
            className="fr-input"
            type="text"
            id="nom"
            value={form.Nom}
            onChange={(e) => setForm({ ...form, Nom: e.target.value })}
            required
          />
        </div>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="prenom">Prénom</label>
          <input
            className="fr-input"
            type="text"
            id="prenom"
            value={form.Prenom}
            onChange={(e) => setForm({ ...form, Prenom: e.target.value })}
            required
          />
        </div>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="email">Email</label>
          <input
            className="fr-input"
            type="email"
            id="email"
            value={form.Email}
            onChange={(e) => setForm({ ...form, Email: e.target.value })}
            required
          />
        </div>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="telephone">Téléphone</label>
          <input
            className="fr-input"
            type="tel"
            id="telephone"
            value={form.Telephone}
            onChange={(e) => setForm({ ...form, Telephone: e.target.value })}
          />
        </div>

        <button className="fr-btn" type="submit" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </main>
  );
}
```

## Gestion avec grist_sync.py

### Push d'un composant

```bash
# Éditer le fichier local
vim grist/page/mon-composant

# Voir les différences
python tools/grist_sync.py diff mon-composant

# Push vers Grist
python tools/grist_sync.py push mon-composant
```

### Pull d'un composant

```bash
# Récupérer depuis Grist
python tools/grist_sync.py pull mon-composant
```

### Création d'un nouveau composant

```bash
# 1. Créer le fichier local
echo "function MonNouveauComposant() { return <div>Hello</div>; }" > grist/page/mon-nouveau-composant

# 2. Push vers Grist
python tools/grist_sync.py push mon-nouveau-composant

# 3. Dans Grist, configurer les propriétés (requires_auth, allowed_roles, etc.)
```

## Bonnes pratiques

### 1. Nommage cohérent

```
✅ Bon : beneficiaire-profil, acheteur-marches
❌ Mauvais : BeneficiaireProfile, acheteur_marches, acheteurMarchés
```

### 2. Structure de code claire

```javascript
// ✅ Bon : Structure organisée
// === Configuration ===
const TABLE = 'MaTable';

// === Composant ===
function MonComposant() {
  // États
  // Effets
  // Fonctions
  // Rendu
}

// ❌ Mauvais : Tout mélangé
function MonComposant() {
  const x = getData('Table');
  return <div>{useState(0)}</div>;
}
```

### 3. Gestion des erreurs

```javascript
// ✅ Bon : Gérer tous les états
if (loading) return <div>Chargement...</div>;
if (error) return <div className="fr-alert fr-alert--error">{error}</div>;
return <div>{data}</div>;

// ❌ Mauvais : Pas de gestion d'erreur
return <div>{data}</div>;
```

### 4. Permissions appropriées

```javascript
// ✅ Bon : requires_auth = true pour données personnelles
// beneficiaire-profil : requires_auth = true, allowed_roles = ['beneficiaire']

// ❌ Mauvais : Page publique avec données sensibles
// beneficiaire-profil : requires_auth = false
```

## Références

- [02-reactapp-class.md](02-reactapp-class.md) - Chargement des composants
- [03-component-lifecycle.md](03-component-lifecycle.md) - Cycle de vie
- [21-gristapi-object.md](21-gristapi-object.md) - API disponible
- [51-grist-sync-tool.md](51-grist-sync-tool.md) - Outil de synchronisation
- [53-component-examples.md](53-component-examples.md) - Plus d'exemples
