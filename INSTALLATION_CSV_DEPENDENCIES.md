# Installation des dépendances pour Bulk CSV Import/Export

## Packages à installer

Exécutez la commande suivante pour installer les packages nécessaires:

### Avec npm
```bash
npm install papaparse csv-stringify
npm install --save-dev @types/papaparse
```

### Avec pnpm
```bash
pnpm add papaparse csv-stringify
pnpm add -D @types/papaparse
```

### Avec yarn
```bash
yarn add papaparse csv-stringify
yarn add --dev @types/papaparse
```

## Version minimale requise

- `papaparse`: ^5.4.1
- `csv-stringify`: ^6.4.6
- `@types/papaparse`: ^5.3.7

## Configuration dans package.json

Vérifiez que les dépendances sont ajoutées dans le fichier `package.json`:

```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "csv-stringify": "^6.4.6"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.7"
  }
}
```

## Étapes d'installation complètes

1. Installer les packages:
```bash
pnpm add papaparse csv-stringify
pnpm add -D @types/papaparse
```

2. Mettre à jour les imports dans les fichiers (si nécessaire):
```typescript
import * as Papa from 'papaparse';
import { stringify } from 'csv-stringify/sync';
```

3. Vérifier que le service CSV est disponible:
```bash
ls -la src/product/csv/product-csv.service.ts
```

4. Tester l'import/export:
```bash
npm run dev
# ou
pnpm dev
```

5. Tester les endpoints:
```bash
# GET template
curl http://localhost:8080/products/bulk/template

# POST import
curl -X POST "http://localhost:8080/products/bulk/import?teamId=YOUR_TEAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv"

# GET export  
curl "http://localhost:8080/products/bulk/export?teamId=YOUR_TEAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Dépendances optionnelles (pour frontendeend avancé)

Pour un meilleur support du parsing côté client:

```bash
pnpm add react-papaparse
```

## Vérification de l'installation

Après l'installation, vous pouvez vérifier que tout fonctionne:

```bash
# Vérifier les packages
npm list papaparse csv-stringify

# Vérifier les types
npm list @types/papaparse
```

## Notes de compatibilité

- **Node.js**: ≥ 14.0.0
- **NestJS**: ≥ 10.0.0
- **TypeScript**: ≥ 4.5.0

## Résolution de problèmes

### Erreur "Cannot find module 'papaparse'"
```bash
# Réinstaller les packages
pnpm install
# ou
npm install
```

### Erreur de types TypeScript
```bash
# Installer les types
pnpm add -D @types/papaparse
```

### Erreur lors du build
```bash
# Nettoyer le cache et reconstruire
pnpm store prune
pnpm install
npm run build
```
