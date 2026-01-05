# Table AuthLink

## Vue d'ensemble

La table `AuthLink` est le cœur du système d'authentification et de contrôle d'accès. Elle gère les tokens d'authentification et associe chaque utilisateur à un rôle spécifique (bénéficiaire, acheteur, ou répondant).

**Note** : Cette table sera renommée prochainement selon les besoins du projet.

## Schéma de la table

| Colonne | Type | Description | Obligatoire |
|---------|------|-------------|-------------|
| `id` | Integer | Identifiant unique auto-incrémenté | ✅ |
| `Email` | Text | Email de l'utilisateur (unique) | ✅ |
| `token` | Text | Token d'authentification UUID | ✅ |
| `created_at` | DateTime | Date de création du token | ✅ |
| `expires_at` | DateTime | Date d'expiration du token | ✅ |
| `Beneficiaire` | Reference | ID du bénéficiaire (si applicable) | ❌ |
| `Acheteur` | Reference | ID de l'acheteur (si applicable) | ❌ |
| `Repondant` | Reference | ID du répondant (si applicable) | ❌ |
| `last_login` | DateTime | Dernière connexion | ❌ |
| `login_count` | Integer | Nombre de connexions | ❌ |

## Système de rôles

### Détermination du rôle

Le rôle de l'utilisateur est déterminé par la colonne Reference remplie :

```python
# Logique de détermination du rôle
if Beneficiaire != 0 and Beneficiaire is not None:
    role = 'beneficiaire'
    user_id = Beneficiaire
elif Acheteur != 0 and Acheteur is not None:
    role = 'acheteur'
    user_id = Acheteur
elif Repondant != 0 and Repondant is not None:
    role = 'repondant'
    user_id = Repondant
else:
    role = None  # Aucun rôle assigné
```

**Règles** :
- Un utilisateur ne peut avoir qu'un seul rôle actif
- Les colonnes Reference mutuellement exclusives
- Si plusieurs colonnes sont remplies, la priorité est : Beneficiaire > Acheteur > Repondant

### Exemples de configurations

#### Bénéficiaire

```
id: 123
Email: 'jean.dupont@example.com'
token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
Beneficiaire: 456  ← Reference vers table Beneficiaire
Acheteur: null
Repondant: null

→ role = 'beneficiaire'
→ beneficiaire_id = 456
```

#### Acheteur

```
id: 124
Email: 'marie.martin@mairie.fr'
token: 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
Beneficiaire: null
Acheteur: 789  ← Reference vers table Acheteur
Repondant: null

→ role = 'acheteur'
→ acheteur_id = 789
```

#### Répondant

```
id: 125
Email: 'pierre.bernard@entreprise.com'
token: 'c3d4e5f6-a7b8-9012-cdef-123456789012'
Beneficiaire: null
Acheteur: null
Repondant: 101  ← Reference vers table Repondant

→ role = 'repondant'
→ repondant_id = 101
```

## Tokens d'authentification

### Format

Les tokens sont des UUID v4 générés aléatoirement :

```
Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
Exemple: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Caractéristiques:
- 36 caractères (32 hex + 4 tirets)
- Cryptographiquement sécurisé
- Collision quasi-impossible
- Non prédictible
```

### Génération

Les tokens sont générés par le workflow n8n lors de l'inscription :

```javascript
// Dans n8n
const crypto = require('crypto');
const token = crypto.randomUUID();

// Insertion dans Grist
await grist.addRecord('AuthLink', {
  Email: userEmail,
  token: token,
  created_at: new Date(),
  expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 jours
  Beneficiaire: beneficiaireId,
  Acheteur: null,
  Repondant: null
});
```

### Durée de vie

**Configuration par défaut** : 90 jours

```javascript
// Calcul de l'expiration
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 90); // +90 jours

// Vérification de l'expiration
const now = new Date();
const expired = expiresAt < now;
```

### Utilisation

Le token est passé dans l'URL du widget :

```
https://grist.example.com/document/widget?token=a1b2c3d4-e5f6-7890-abcd-ef1234567890&page=home

Extraction dans le widget:
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
```

## Flux d'authentification

### 1. Inscription

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur remplit formulaire d'inscription             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Workflow n8n reçoit les données                          │
│    - Validation des données                                 │
│    - Vérification email unique                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Création de l'enregistrement métier                      │
│    - AddRecord dans table Beneficiaire/Acheteur/Repondant   │
│    - Obtention de l'ID                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Génération du token                                      │
│    - token = crypto.randomUUID()                            │
│    - expires_at = now + 90 days                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Création de l'AuthLink                                   │
│    - AddRecord dans AuthLink                                │
│    - Lien avec l'enregistrement métier                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Envoi de l'email de bienvenue                            │
│    - Lien vers le widget avec token                         │
│    - https://...?token=xxx&page=home                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Connexion

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur clique sur le lien avec token                │
│    https://...?token=xxx                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Widget extrait le token de l'URL                         │
│    const token = urlParams.get('token')                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. checkAuth() fetch la table AuthLink                      │
│    const authData = await grist.docApi.fetchTable('AuthLink')│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ACL Grist filtre les résultats                           │
│    L'utilisateur ne voit que la ligne avec son token        │
│    Règle: rec.token == user.token                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Vérification de l'expiration                             │
│    if (expires_at < now) → Token expiré                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Détermination du rôle                                    │
│    if (Beneficiaire) role = 'beneficiaire'                  │
│    else if (Acheteur) role = 'acheteur'                     │
│    else if (Repondant) role = 'repondant'                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Stockage dans currentUser                                │
│    { id, email, token, role, xxx_id, ... }                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Chargement de la page d'accueil selon le rôle            │
│    beneficiaire → beneficiaire-home                         │
│    acheteur → acheteur-home                                 │
│    repondant → repondant-home                               │
└─────────────────────────────────────────────────────────────┘
```

## Règles ACL Grist

### Lecture de AuthLink

```python
# L'utilisateur ne peut lire que sa propre ligne
user.Access == 'owners' or rec.token == user.token

# Explications:
# - user.Access == 'owners' : Les propriétaires du document voient tout
# - rec.token == user.token : L'utilisateur voit uniquement la ligne avec son token
```

**Résultat** :
- Avec token `abc123`, l'utilisateur ne voit que la ligne où `token = 'abc123'`
- Impossible de voir les tokens des autres utilisateurs
- Les propriétaires Grist voient toutes les lignes

### Écriture de AuthLink

```python
# Seuls les propriétaires peuvent écrire
user.Access == 'owners'

# Les utilisateurs normaux ne peuvent pas:
# - Créer de nouveaux tokens
# - Modifier leur token
# - Modifier leur rôle
# - Voir d'autres utilisateurs
```

### Accès aux tables métier

```python
# Table Beneficiaire
user.Access == 'owners' or rec.id == user.AuthLink.Beneficiaire

# Table Acheteur
user.Access == 'owners' or rec.id == user.AuthLink.Acheteur

# Table Repondant
user.Access == 'owners' or rec.id == user.AuthLink.Repondant

# Explications:
# - user.AuthLink : Ligne AuthLink de l'utilisateur actuel
# - user.AuthLink.Beneficiaire : ID du bénéficiaire lié
# - rec.id == user.AuthLink.Beneficiaire : Accès uniquement à sa propre ligne
```

## Opérations courantes

### Vérifier un token

```javascript
// Dans le widget
async function checkAuth() {
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    return null; // Pas de token
  }

  try {
    const authData = await grist.docApi.fetchTable('AuthLink');

    if (authData.length === 0) {
      return null; // Token invalide ou expiré
    }

    const authRow = authData[0]; // Grâce aux ACL, c'est forcément notre ligne

    // Vérifier l'expiration
    const expiresAt = new Date(authRow.expires_at);
    if (expiresAt < new Date()) {
      return null; // Token expiré
    }

    // Déterminer le rôle
    let role = null;
    let user_id = null;

    if (authRow.Beneficiaire) {
      role = 'beneficiaire';
      user_id = authRow.Beneficiaire;
    } else if (authRow.Acheteur) {
      role = 'acheteur';
      user_id = authRow.Acheteur;
    } else if (authRow.Repondant) {
      role = 'repondant';
      user_id = authRow.Repondant;
    }

    return {
      id: authRow.id,
      email: authRow.Email,
      token: token,
      role: role,
      beneficiaire_id: authRow.Beneficiaire || null,
      acheteur_id: authRow.Acheteur || null,
      repondant_id: authRow.Repondant || null,
      expires_at: authRow.expires_at,
      created_at: authRow.created_at
    };

  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}
```

### Mettre à jour last_login

```javascript
// Dans n8n ou via webhook
async function updateLastLogin(authLinkId) {
  await grist.docApi.applyUserActions([
    ['UpdateRecord', 'AuthLink', authLinkId, {
      last_login: new Date(),
      login_count: { formula: '$login_count + 1' }
    }]
  ]);
}
```

### Renouveler un token

```javascript
// Dans n8n
async function renewToken(authLinkId) {
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 90);

  await grist.docApi.applyUserActions([
    ['UpdateRecord', 'AuthLink', authLinkId, {
      token: newToken,
      expires_at: newExpiresAt
    }]
  ]);

  // Envoyer email avec nouveau lien
  sendEmail(user.email, `https://...?token=${newToken}`);
}
```

### Révoquer un token

```javascript
// Dans n8n
async function revokeToken(authLinkId) {
  await grist.docApi.applyUserActions([
    ['UpdateRecord', 'AuthLink', authLinkId, {
      expires_at: new Date() // Expiration immédiate
    }]
  ]);
}
```

## Sécurité

### Bonnes pratiques

1. **Tokens uniques et aléatoires** : Utiliser crypto.randomUUID()
2. **HTTPS uniquement** : Ne jamais transmettre les tokens en HTTP
3. **Expiration** : Configurer une durée de vie limitée
4. **Pas de stockage local** : Ne pas stocker les tokens dans localStorage
5. **URL only** : Le token doit rester dans l'URL pour les ACL Grist

### Attaques à prévenir

#### Énumération de tokens

**Risque** : Attaquant essaie de deviner des tokens

**Mitigation** :
- UUID v4 = 2^122 possibilités (quasi-impossible à deviner)
- Pas de pattern prédictible
- Expiration limitée

#### Interception

**Risque** : Token intercepté lors de la transmission

**Mitigation** :
- HTTPS obligatoire
- Pas d'envoi par email en clair (lien direct)
- Expiration rapide en cas de compromission

#### Réutilisation

**Risque** : Ancien token réutilisé après expiration

**Mitigation** :
- Vérification stricte de expires_at
- Renouvellement périodique
- Révocation possible

## Migration et renommage

**Note importante** : Cette table sera renommée prochainement.

### Plan de migration

```sql
-- 1. Créer nouvelle table avec nouveau nom
CREATE TABLE AuthToken AS SELECT * FROM AuthLink;

-- 2. Mettre à jour les règles ACL
-- Remplacer user.AuthLink par user.AuthToken

-- 3. Mettre à jour le code du widget
-- Remplacer 'AuthLink' par 'AuthToken' dans les fetchTable()

-- 4. Tester complètement

-- 5. Supprimer l'ancienne table
DROP TABLE AuthLink;
```

## Statistiques et monitoring

### Requêtes utiles

```javascript
// Nombre d'utilisateurs actifs
const authData = await grist.docApi.fetchTable('AuthLink');
const activeUsers = authData.filter(row => {
  const expiresAt = new Date(row.expires_at);
  return expiresAt > new Date();
});
console.log('Active users:', activeUsers.length);

// Répartition par rôle
const beneficiaires = authData.filter(row => row.Beneficiaire).length;
const acheteurs = authData.filter(row => row.Acheteur).length;
const repondants = authData.filter(row => row.Repondant).length;

// Tokens expirant bientôt (< 7 jours)
const soon = authData.filter(row => {
  const expiresAt = new Date(row.expires_at);
  const daysLeft = (expiresAt - new Date()) / (1000 * 60 * 60 * 24);
  return daysLeft > 0 && daysLeft < 7;
});
```

## Références

- [30-authentication-flow.md](30-authentication-flow.md) - Flux d'authentification détaillé
- [31-acl-rules.md](31-acl-rules.md) - Règles ACL complètes
- [32-security-best-practices.md](32-security-best-practices.md) - Sécurité
- [02-reactapp-class.md](02-reactapp-class.md) - Méthode checkAuth()
