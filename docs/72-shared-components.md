# Système de composants partagés et enfants

## Vue d'ensemble

Le widget Grist DSFR React implémente deux systèmes de composants réutilisables :

1. **Composants partagés (Shared Components)** : Composants globaux chargés au démarrage, accessibles depuis n'importe quelle page
2. **Composants enfants (Child Components)** : Instances de composants créées dynamiquement avec des données spécifiques (overrides)

## Composants partagés (Shared Components)

### Concept

Les composants partagés sont des composants React réutilisables (modales, cartes, formulaires, etc.) qui sont :
- Chargés **une seule fois** au démarrage de l'application
- Stockés dans `this.sharedComponents` (Map)
- Accessibles depuis n'importe quel composant via `gristAPI.getComponent(name)`
- Identifiés par `type = 'component'` dans la table `Application_Composants`

### Configuration dans Grist

Dans la table `Application_Composants`, pour créer un composant partagé :

| Colonne | Valeur | Description |
|---------|--------|-------------|
| `template_id` | `'modal-confirm'` | Identifiant unique |
| `template_name` | `'Modale de confirmation'` | Nom descriptif |
| `type` ou `Type` ou `component_kind` | `'component'` | **Important : marque le composant comme partagé** |
| `component_code` | Code JSX | Code du composant React |
| `requires_auth` | `false` | Généralement false pour composants partagés |
| `show_in_nav` | `false` | Ne pas afficher dans la navigation |

**Exemple de configuration** :
```
template_id: 'modal-confirm'
type: 'component'
component_code:
  function ModalConfirm({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
      <div className="fr-modal" role="dialog">
        <div className="fr-modal__body">
          <div className="fr-modal__header">
            <button className="fr-btn--close fr-btn" onClick={onClose}>
              Fermer
            </button>
          </div>
          <div className="fr-modal__content">
            <h1 className="fr-modal__title">{title}</h1>
            <p>{message}</p>
          </div>
          <div className="fr-modal__footer">
            <button className="fr-btn fr-btn--secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="fr-btn" onClick={onConfirm}>
              Confirmer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Export du composant (important !)
  Component = ModalConfirm;
```

### Export du composant partagé

**Important** : Pour qu'un composant partagé soit correctement exporté, vous devez utiliser l'une de ces syntaxes :

#### Option 1 : Variable `Component` (recommandée)
```javascript
function MonComposant({ title, children }) {
  return <div>{title}: {children}</div>;
}

// Export via variable Component
Component = MonComposant;
```

#### Option 2 : module.exports
```javascript
function MonComposant({ title, children }) {
  return <div>{title}: {children}</div>;
}

// Export via module.exports
module.exports = MonComposant;
```

#### Option 3 : exports par défaut
```javascript
function MonComposant({ title, children }) {
  return <div>{title}: {children}</div>;
}

// Export
exports = MonComposant;
```

### Chargement au démarrage

Les composants partagés sont chargés automatiquement dans `loadComponents()` :

```javascript
// Dans ReactApp.loadComponents()
for (const template of templates) {
  const kind = (template.type || template.Type || template.component_kind || '').toLowerCase();

  if (kind === 'component') {
    // C'est un composant partagé
    const shared = await this.instantiateSharedComponent(processed);
    if (shared && processed.id) {
      this.sharedComponents.set(processed.id, shared);
    }
  } else {
    // C'est une page normale
    this.components.set(processed.id, processed);
  }
}
```

### Utilisation dans un composant

**Méthode** : `gristAPI.getComponent(name)`

**Paramètres** :
- `name` (string) : `template_id` du composant partagé

**Retour** : Composant React ou `null` si non trouvé

**Exemple** :
```javascript
function MaPage() {
  const { React, getComponent } = gristAPI;
  const { useState } = React;

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Récupérer le composant partagé
  const ModalConfirm = getComponent('modal-confirm');

  // Si le composant n'est pas chargé
  if (!ModalConfirm) {
    console.warn('Composant modal-confirm non disponible');
    return <div>Erreur de chargement</div>;
  }

  const handleDelete = (item) => {
    setItemToDelete(item);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    await gristAPI.deleteRecord('MaTable', itemToDelete.id);
    setModalOpen(false);
    setItemToDelete(null);
    // Recharger les données...
  };

  return (
    <div className="fr-container">
      <h1>Ma liste</h1>

      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.nom}
            <button onClick={() => handleDelete(item)}>Supprimer</button>
          </li>
        ))}
      </ul>

      {/* Utilisation du composant partagé */}
      <ModalConfirm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer "${itemToDelete?.nom}" ?`}
      />
    </div>
  );
}
```

### Exemples de composants partagés

#### Modale simple

```javascript
// template_id: 'modal-simple'
// type: 'component'

function ModalSimple({ isOpen, onClose, title, children }) {
  const { React } = gristAPI;
  const { useEffect } = React;

  // Fermer avec Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fr-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        className="fr-modal__body fr-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="fr-modal__header">
          <button
            className="fr-btn--close fr-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>
        <div className="fr-modal__content">
          {title && <h1 className="fr-modal__title">{title}</h1>}
          {children}
        </div>
      </div>
    </div>
  );
}

Component = ModalSimple;
```

#### Carte (Card) réutilisable

```javascript
// template_id: 'card-item'
// type: 'component'

function CardItem({ title, description, imageUrl, badges, actions, onClick }) {
  return (
    <div className="fr-card fr-enlarge-link" onClick={onClick}>
      {imageUrl && (
        <div className="fr-card__img">
          <img src={imageUrl} className="fr-responsive-img" alt={title} />
        </div>
      )}
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            {title}
          </h3>
          {description && (
            <p className="fr-card__desc">{description}</p>
          )}
          {badges && badges.length > 0 && (
            <div className="fr-card__start">
              {badges.map((badge, i) => (
                <span key={i} className={`fr-badge ${badge.variant || ''}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="fr-card__footer">
            <div className="fr-btns-group fr-btns-group--inline-sm">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={`fr-btn ${action.variant || ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Component = CardItem;
```

**Utilisation** :
```javascript
function MaListe() {
  const CardItem = gristAPI.getComponent('card-item');

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {items.map(item => (
        <div key={item.id} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
          <CardItem
            title={item.nom}
            description={item.description}
            imageUrl={item.image}
            badges={[
              { label: item.statut, variant: 'fr-badge--success' }
            ]}
            actions={[
              { label: 'Voir', onClick: () => navigate('details', { id: item.id }) },
              { label: 'Éditer', variant: 'fr-btn--secondary', onClick: () => edit(item) }
            ]}
            onClick={() => navigate('details', { id: item.id })}
          />
        </div>
      ))}
    </div>
  );
}
```

#### Loader réutilisable

```javascript
// template_id: 'loader'
// type: 'component'

function Loader({ message = 'Chargement...', size = 'normal' }) {
  const sizeClass = size === 'small' ? 'fr-loader--sm' : '';

  return (
    <div className="fr-container fr-my-4w" style={{ textAlign: 'center' }}>
      <div className={`fr-loader ${sizeClass}`} aria-label="Chargement en cours"></div>
      {message && <p className="fr-mt-2w">{message}</p>}
    </div>
  );
}

Component = Loader;
```

## Composants enfants (Child Components)

### Concept

Les composants enfants permettent de créer des **instances multiples** d'un même template de composant avec des données différentes (overrides). C'est utile pour :
- Créer des listes d'items avec le même template
- Instancier des composants avec des configurations différentes
- Créer des composants de manière programmatique

### Méthodes disponibles

#### `gristAPI.getChildComponent(templateId, overrides)`

Charge un template depuis Grist et crée une instance avec overrides.

**Paramètres** :
- `templateId` (string) : `template_id` du composant dans `Application_Composants`
- `overrides` (object) : Données à injecter dans le composant

**Retour** : `Promise<ReactComponent>` ou `null`

**Exemple** :
```javascript
function MaListe() {
  const { React, getChildComponent } = gristAPI;
  const { useState, useEffect } = React;

  const [items, setItems] = useState([]);
  const [ItemCard, setItemCard] = useState(null);

  useEffect(() => {
    // Charger les données
    gristAPI.getData('MaTable').then(setItems);

    // Charger le template de carte
    getChildComponent('item-card-template', {}).then(setItemCard);
  }, []);

  if (!ItemCard) return <div>Chargement...</div>;

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {items.map(item => (
        <div key={item.id} className="fr-col-12 fr-col-md-6">
          {/* Créer une instance de ItemCard pour chaque item */}
          <ItemCard data={item} />
        </div>
      ))}
    </div>
  );
}
```

#### `gristAPI.createChildComponent(template, overrides)`

Crée directement une instance depuis un objet template (sans fetch Grist).

**Paramètres** :
- `template` (object) : Objet template du composant
- `overrides` (object) : Données à injecter

**Retour** : `ReactComponent`

**Exemple** :
```javascript
function MaPage() {
  const { createChildComponent } = gristAPI;

  const template = {
    template_id: 'custom-alert',
    component_code: `
      function Alert({ message, type }) {
        return (
          <div className={\`fr-alert fr-alert--\${type}\`}>
            <p>{message}</p>
          </div>
        );
      }
    `
  };

  const CustomAlert = createChildComponent(template, {
    message: 'Bienvenue !',
    type: 'info'
  });

  return (
    <div>
      <CustomAlert />
    </div>
  );
}
```

### Implémentation interne

```javascript
// Dans ReactApp.createChildComponent()
createChildComponent(template, overrides = {}) {
  try {
    const cleanCode = this.sanitizeCode(template.component_code || template.code);

    // Transformation Babel
    const transformed = Babel.transform(cleanCode, {
      presets: ['react'],
      plugins: ['proposal-class-properties']
    }).code;

    // Création de l'API locale avec overrides
    const localAPI = {
      ...this.gristAPI,
      overrides  // Les overrides sont accessibles dans le composant
    };

    // Création de la factory
    const factory = new Function(
      'React',
      'useState',
      'useEffect',
      'useCallback',
      'gristAPI',
      `
        ${transformed}
        // Retourner la fonction composant
        return typeof Component !== 'undefined' ? Component : null;
      `
    );

    // Exécution et retour du composant
    return factory(
      React,
      React.useState,
      React.useEffect,
      React.useCallback,
      localAPI
    );

  } catch (err) {
    console.error(`Erreur création composant enfant:`, err);

    // Composant d'erreur
    return () => React.createElement('div',
      { className: 'fr-alert fr-alert--error fr-p-2w' },
      `Erreur: ${template?.template_id || 'child'}`
    );
  }
}
```

### Accès aux overrides dans le composant enfant

Les `overrides` sont accessibles via `gristAPI.overrides` :

```javascript
// Template dans Application_Composants
// template_id: 'item-card-template'
// component_code:

function ItemCard() {
  const { overrides } = gristAPI;
  const item = overrides.data;

  if (!item) {
    return <div>Aucune donnée fournie</div>;
  }

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h3 className="fr-card__title">{item.nom}</h3>
        <p className="fr-card__desc">{item.description}</p>
      </div>
    </div>
  );
}

Component = ItemCard;
```

**Utilisation** :
```javascript
function MaListe() {
  const { useState, useEffect } = gristAPI.React;
  const [items, setItems] = useState([]);

  useEffect(() => {
    gristAPI.getData('MaTable').then(setItems);
  }, []);

  return (
    <div>
      {items.map(item => {
        // Créer une instance avec overrides pour chaque item
        const ItemCard = await gristAPI.getChildComponent('item-card-template', {
          data: item
        });

        return <ItemCard key={item.id} />;
      })}
    </div>
  );
}
```

### Exemple complet avec composant enfant

#### Template dans Grist

```javascript
// template_id: 'product-card'
// type: 'page' (pas 'component', car utilisé comme template)
// component_code:

function ProductCard() {
  const { React, overrides, navigate } = gristAPI;
  const { useState } = React;

  const product = overrides.product;
  const onAddToCart = overrides.onAddToCart;

  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return <div className="fr-alert fr-alert--warning">Produit non disponible</div>;
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, quantity);
    }
  };

  return (
    <div className="fr-card">
      <div className="fr-card__img">
        <img
          src={product.image_url}
          alt={product.nom}
          className="fr-responsive-img"
        />
      </div>
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">{product.nom}</h3>
          <p className="fr-card__desc">{product.description}</p>
          <p className="fr-text--bold">{product.prix} €</p>
        </div>
        <div className="fr-card__footer">
          <div className="fr-input-group">
            <label className="fr-label">Quantité</label>
            <input
              type="number"
              className="fr-input"
              value={quantity}
              min="1"
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <button className="fr-btn" onClick={handleAddToCart}>
            Ajouter au panier
          </button>
          <button
            className="fr-btn fr-btn--secondary"
            onClick={() => navigate('product-details', { id: product.id })}
          >
            Voir détails
          </button>
        </div>
      </div>
    </div>
  );
}

Component = ProductCard;
```

#### Utilisation dans une page

```javascript
// Page catalogue
function Catalogue() {
  const { React, getData, getChildComponent } = gristAPI;
  const { useState, useEffect } = React;

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [ProductCard, setProductCard] = useState(null);

  useEffect(() => {
    // Charger les produits
    getData('Products').then(setProducts);

    // Charger le template de carte produit
    getChildComponent('product-card', {}).then(setProductCard);
  }, []);

  const handleAddToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);

      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { product, quantity }];
    });

    alert(`${quantity} x ${product.nom} ajouté(s) au panier`);
  };

  if (!ProductCard) {
    return <div>Chargement du catalogue...</div>;
  }

  return (
    <div className="fr-container fr-my-4w">
      <h1>Catalogue</h1>

      <div className="fr-alert fr-alert--info fr-mb-3w">
        <p>Panier : {cart.reduce((sum, item) => sum + item.quantity, 0)} article(s)</p>
      </div>

      <div className="fr-grid-row fr-grid-row--gutters">
        {products.map(product => {
          // Créer une instance de ProductCard avec overrides spécifiques
          const CardInstance = () => {
            // Injecter les overrides spécifiques à ce produit
            const localAPI = {
              ...gristAPI,
              overrides: {
                product: product,
                onAddToCart: handleAddToCart
              }
            };

            // Le composant enfant utilise ces overrides
            return React.createElement(ProductCard);
          };

          return (
            <div key={product.id} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
              <CardInstance />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Comparaison : Shared vs Child

| Aspect | Composants partagés | Composants enfants |
|--------|---------------------|-------------------|
| **Chargement** | Au démarrage (une fois) | À la demande (dynamique) |
| **Stockage** | `this.sharedComponents` Map | Pas de cache |
| **Type dans Grist** | `type = 'component'` | N'importe quel type |
| **Accès** | `getComponent(name)` | `getChildComponent(id, overrides)` |
| **Use case** | Composants UI réutilisables (modales, cartes, etc.) | Templates avec données variables |
| **Overrides** | Props React classiques | Via `gristAPI.overrides` |
| **Performance** | Optimal (chargé une fois) | Compilation à chaque instance |

## Bonnes pratiques

### 1. Quand utiliser des composants partagés

✅ **Utilisez des composants partagés pour** :
- Modales, dialogues, alertes
- Composants UI réutilisables (cartes, boutons spéciaux, etc.)
- Composants utilisés dans plusieurs pages
- Composants sans état ou avec état interne simple

```javascript
// Bon : Modale partagée
const Modal = getComponent('modal-confirm');
<Modal isOpen={open} onClose={close} />
```

### 2. Quand utiliser des composants enfants

✅ **Utilisez des composants enfants pour** :
- Templates de liste avec données différentes
- Composants générés dynamiquement
- Composants avec configuration complexe via overrides

```javascript
// Bon : Template de carte avec données spécifiques
const ItemCard = await getChildComponent('item-card', { data: item });
```

### 3. Export correct

```javascript
// ✅ Bon : Export explicite
function MonComposant() { /* ... */ }
Component = MonComposant;

// ❌ Mauvais : Pas d'export
function MonComposant() { /* ... */ }
```

### 4. Nommage cohérent

```javascript
// ✅ Bon : Noms clairs
template_id: 'modal-confirm'
template_id: 'card-product'
template_id: 'loader-spinner'

// ❌ Mauvais : Noms ambigus
template_id: 'comp1'
template_id: 'thing'
```

### 5. Gestion des erreurs

```javascript
// ✅ Bon : Vérifier l'existence
const Modal = getComponent('modal');
if (!Modal) {
  console.warn('Modal component not found');
  return <div>Erreur</div>;
}

// ❌ Mauvais : Pas de vérification
const Modal = getComponent('modal');
return <Modal />; // Peut crasher si Modal est null
```

## Débogage

### Vérifier les composants chargés

```javascript
// Dans la console du navigateur
console.log('Shared components:', app.sharedComponents);

// Lister tous les composants partagés
for (const [id, component] of app.sharedComponents) {
  console.log(`- ${id}:`, component);
}
```

### Erreurs courantes

#### Erreur : "Component not found"

```javascript
const Modal = getComponent('my-modal');
// → null
```

**Causes** :
- Le `template_id` est incorrect
- Le composant n'a pas `type = 'component'`
- Le composant n'a pas été correctement exporté
- Erreur de chargement au démarrage

**Solution** :
1. Vérifier `template_id` dans Grist
2. Vérifier `type = 'component'`
3. Vérifier l'export (`Component = ...`)
4. Regarder les logs console au démarrage

#### Erreur : "Cannot read property 'overrides'"

```javascript
// Dans un composant enfant
const data = gristAPI.overrides.data;
// → Cannot read property 'data' of undefined
```

**Cause** : Les overrides n'ont pas été passés lors de la création

**Solution** :
```javascript
// Passer les overrides
const Card = await getChildComponent('card', { data: myData });
```

## Références

- [02-reactapp-class.md](02-reactapp-class.md) - Méthodes loadComponents et instantiateSharedComponent
- [11-application-composants.md](11-application-composants.md) - Table Application_Composants
- [21-gristapi-object.md](21-gristapi-object.md) - API gristAPI
- [53-component-examples.md](53-component-examples.md) - Plus d'exemples
