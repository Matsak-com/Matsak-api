# Bulk CSV Import/Export pour les Produits

## Vue d'ensemble

Cette fonctionnalité permet l'import et l'export en masse de produits via des fichiers CSV, idéale pour:
- Onboarding rapide de plusieurs produits
- Migration de données depuis d'autres systèmes
- Mise à jour en masse des produits
- Sauvegarde/export de l'inventaire

## Architecture

### Services
- **ProductCsvService** (`src/product/csv/product-csv.service.ts`) - Logique de parsing CSV et conversion
- **ProductService** - Orchestration des opérations bulk et persistance

### DTOs
- **BulkImportProductsDto** - Paramètres d'import
- **BulkExportProductsDto** - Paramètres d'export

### Endpoints

#### 1. Obtenir le template CSV

**GET** `/products/bulk/template`

Télécharge un fichier CSV template avec les colonnes et un exemple de données.

**Réponse:**
- Status: 200 OK
- Type: `text/csv`
- Fichier: `products-template.csv`

**Exemple:**
```bash
curl -X GET "http://localhost:8080/products/bulk/template" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o products-template.csv
```

#### 2. Importer des produits depuis CSV

**POST** `/products/bulk/import?teamId={teamId}&skipOnError={boolean}`

Importe les produits depuis un fichier CSV.

**Query Parameters:**
- `teamId` (required) - ID de l'équipe
- `skipOnError` (optional) - `true` ou `1` pour continuer même en cas d'erreur (default: false)

**Body:** Form-data
- `file` (required) - Fichier CSV (max 10MB)

**Réponse:**
```json
{
  "total": 10,
  "successful": 9,
  "failed": 1,
  "errors": [
    {
      "row": 5,
      "data": { "name": "Product Name", "basePrice": "invalid" },
      "error": "Base price must be a valid number"
    }
  ],
  "successfulProducts": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product Name"
    }
  ]
}
```

**Exemple:**
```bash
curl -X POST "http://localhost:8080/products/bulk/import?teamId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"

# Avec skipOnError
curl -X POST "http://localhost:8080/products/bulk/import?teamId=507f1f77bcf86cd799439011&skipOnError=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"
```

#### 3. Exporter les produits vers CSV

**GET** `/products/bulk/export?teamId={teamId}&includeImages={boolean}&includeDiscounts={boolean}`

Exporte tous les produits d'une équipe au format CSV.

**Query Parameters:**
- `teamId` (required) - ID de l'équipe
- `includeImages` (optional) - `true` ou `1` pour inclure les URLs d'images (default: false)
- `includeDiscounts` (optional) - `true` ou `1` pour inclure les infos de remise (default: true)

**Réponse:**
- Status: 200 OK
- Type: `text/csv`
- Fichier: `products-{teamId}-{date}.csv`

**Exemple:**
```bash
curl -X GET "http://localhost:8080/products/bulk/export?teamId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o products.csv

# Avec remises
curl -X GET "http://localhost:8080/products/bulk/export?teamId=507f1f77bcf86cd799439011&includeDiscounts=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o products.csv
```

## Format CSV

### Colonnes supportées

| Colonne | Type | Requis | Description |
|---------|------|--------|-------------|
| `name` | string | ✓ | Nom du produit |
| `description` | string | ✗ | Description du produit |
| `basePrice` | number | ✓ | Prix de base (≥ 0) |
| `currency` | string | ✗ | Devise (default: MGA) |
| `categoryName` | string | ✗ | Nom de la catégorie |
| `subcategoryName` | string | ✗ | Nom de la sous-catégorie |
| `sku` | string | ✗ | Code SKU |
| `barcode` | string | ✗ | Code-barres |
| `weight` | number | ✗ | Poids |
| `stockQuantity` | integer | ✗ | Quantité en stock |
| `trackStock` | boolean | ✗ | Suivi du stock (true/false) |
| `lowStockThreshold` | integer | ✗ | Seuil de stock faible |
| `isActive` | boolean | ✗ | Produit actif (true/false) |
| `discountType` | string | ✗ | Type de remise (percentage/fixed/bulk) |
| `discountValue` | number | ✗ | Valeur de la remise |
| `additionalInfo` | string | ✗ | Infos supplémentaires |
| `seoTitle` | string | ✗ | Titre SEO |
| `seoDescription` | string | ✗ | Description SEO |
| `seoKeywords` | string | ✗ | Mots-clés SEO |

### Exemple de CSV

```csv
name,description,basePrice,currency,categoryName,subcategoryName,sku,barcode,weight,stockQuantity,trackStock,lowStockThreshold,isActive,discountType,discountValue
Ibuprofen 400mg,Pain relief tablet,100,MGA,Pharmaceuticals,Pain Relief,IBU-400,123456789,0.5,500,true,50,true,percentage,10
Paracetamol 500mg,Fever reducer,80,MGA,Pharmaceuticals,Pain Relief,PAR-500,987654321,0.45,300,true,30,true,fixed,5
Vitamin C,Immune booster,50,MGA,Supplements,Vitamins,VIT-C,555555555,0.2,1000,true,100,true,,
```

## Validation

### Règles de validation

1. **Champs requis:**
   - `name` - Non vide
   - `basePrice` - Nombre positif valide

2. **Champs numériques:**
   - `basePrice` - ≥ 0
   - `weight` - Nombre positif
   - `stockQuantity` - Entier ≥ 0
   - `lowStockThreshold` - Entier ≥ 0
   - `discountValue` - ≥ 0

3. **Champs booléens:**
   - `trackStock` - true/false/1/0/yes/no
   - `isActive` - true/false/1/0/yes/no

4. **Types de remise:**
   - Valeurs acceptées: `percentage`, `fixed`, `bulk`
   - Si `discountType` est spécifié, `discountValue` est requis

### Gestion des erreurs

- **skipOnError=false (default):** L'import s'arrête à la première erreur
- **skipOnError=true:** L'import continue et rapporte les erreurs à la fin

**Exemple de réponse d'erreur:**
```json
{
  "total": 3,
  "successful": 1,
  "failed": 2,
  "errors": [
    {
      "row": 2,
      "data": { "name": "", "basePrice": "100" },
      "error": "Product name is required"
    },
    {
      "row": 3,
      "data": { "name": "Product", "basePrice": "invalid" },
      "error": "Valid base price is required"
    }
  ],
  "successfulProducts": [...]
}
```

## Cas d'usage

### 1. Import initial d'inventaire

```bash
# Télécharger le template
curl -X GET http://localhost:8080/products/bulk/template \
  -H "Authorization: Bearer $TOKEN" \
  -o template.csv

# Remplir le CSV avec vos données
# Importer les produits
curl -X POST "http://localhost:8080/products/bulk/import?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@inventory.csv"
```

### 2. Mise à jour en masse

```bash
# Exporter les produits actuels
curl -X GET "http://localhost:8080/products/bulk/export?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o products.csv

# Modifier le CSV (ex: mettre à jour les prix)
# Ré-importer avec skipOnError
curl -X POST "http://localhost:8080/products/bulk/import?teamId=$TEAM_ID&skipOnError=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@products-updated.csv"
```

### 3. Sauvegarde/migration

```bash
# Exporter tous les produits pour sauvegarde
curl -X GET "http://localhost:8080/products/bulk/export?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o backup-$(date +%Y%m%d).csv

# Importer dans un autre système/équipe
curl -X POST "http://localhost:8080/products/bulk/import?teamId=$NEW_TEAM_ID&skipOnError=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@backup-20250719.csv"
```

## Limitations et notes

1. **Taille max du fichier:** 10MB
2. **Images:** Ne sont pas importées via CSV (référencez les URLs dans les données descriptives)
3. **Catégories:** Les noms de catégories doivent exister ou être créés séparément
4. **Performance:** Pour > 1000 produits, utilisez `skipOnError=true` pour éviter les rollbacks complets
5. **Caractères spéciaux:** Utilisez des guillemets pour les valeurs contenant des virgules ou des retours à la ligne

## Intégration frontend

### Exemple avec FormData (JavaScript)

```javascript
// Import
async function bulkImportProducts(file, teamId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/products/bulk/import?teamId=${teamId}&skipOnError=true`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  return response.json();
}

// Export
async function bulkExportProducts(teamId) {
  const response = await fetch(
    `/products/bulk/export?teamId=${teamId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${teamId}.csv`;
  a.click();
}

// Template
async function downloadTemplate() {
  const response = await fetch(`/products/bulk/template`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products-template.csv';
  a.click();
}
```

## Dépendances

- `papaparse` - Parsing CSV (utilisé via import dynamique)
- `csv-stringify` - Génération CSV

Les dépendances doivent être ajoutées à `package.json`:
```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "csv-stringify": "^6.4.6"
  }
}
```

## Sécurité

- ✓ Validation complète des données
- ✓ Authentification JWT requise
- ✓ Limite de taille de fichier (10MB)
- ✓ Validation du type MIME
- ✓ Sanitization des données entrantes
- ✓ Gestion d'erreurs sécurisée
- ⚠️ À implémenter: Rate limiting sur les endpoints bulk

## Permissions

- Endpoints protégés par `JwtAuthGuard`
- À ajouter: Vérification des permissions par rôle
- À ajouter: Vérification de l'accès aux équipes
