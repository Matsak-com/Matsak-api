# ✅ Checklist d'Implémentation - Bulk CSV Import/Export

## 📋 Phase 1: Installation et Configuration

- [ ] **Installer les dépendances NPM**
  ```bash
  pnpm add papaparse csv-stringify
  pnpm add -D @types/papaparse
  ```
  - [ ] Vérifier que `papaparse`, `csv-stringify`, et `@types/papaparse` sont dans `package.json`
  - [ ] Vérifier que `pnpm install` fonctionne sans erreur

- [ ] **Vérifier les fichiers implémentés**
  - [ ] `src/product/csv/product-csv.service.ts` existe
  - [ ] `src/product/csv/product-csv.service.spec.ts` existe
  - [ ] `src/product/dto/bulk-import-export.dto.ts` existe
  - [ ] `src/product/components/BulkProductImportExport.tsx` existe

- [ ] **Mettre à jour le module Product**
  - [ ] Ouvrir `src/product/product.module.ts`
  - [ ] Ajouter `import { ProductCsvService }` 
  - [ ] Ajouter `ProductCsvService` au tableau `providers`
  - [ ] Ajouter `ProductCsvService` au tableau `exports`

- [ ] **Vérifier les modifications apportées**
  - [ ] `src/product/product.service.ts` contient les 3 nouvelles méthodes
  - [ ] `src/product/product.controller.ts` contient les 3 nouveaux endpoints

## 🔧 Phase 2: Configuration et Démarrage

- [ ] **Compiler le code**
  ```bash
  pnpm run build
  ```
  - [ ] Pas d'erreurs de compilation
  - [ ] Vérifier que `dist/product/csv/product-csv.service.js` existe

- [ ] **Vérifier les types TypeScript**
  ```bash
  pnpm tsc --noEmit
  ```
  - [ ] Pas d'erreurs de type

- [ ] **Démarrer le serveur**
  ```bash
  pnpm dev
  ```
  - [ ] Serveur démarre sans erreur
  - [ ] Produit module chargé correctement

## 🧪 Phase 3: Tests des Endpoints

### Test 1: Template CSV

- [ ] **Télécharger le template**
  ```bash
  curl http://localhost:8080/products/bulk/template \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -o template.csv
  ```
  - [ ] Statut HTTP 200
  - [ ] Fichier `template.csv` téléchargé
  - [ ] Fichier contient les en-têtes CSV

- [ ] **Vérifier le contenu du template**
  - [ ] Première ligne: `name,description,basePrice,...`
  - [ ] Deuxième ligne: Exemple de produit
  - [ ] Au moins 19 colonnes présentes

### Test 2: Import CSV

- [ ] **Créer un fichier CSV de test**
  ```csv
  name,description,basePrice,currency,sku,stockQuantity,isActive
  Produit Test 1,Description test,5000,MGA,SKU001,100,true
  Produit Test 2,Description test 2,8000,MGA,SKU002,50,true
  ```

- [ ] **Importer les produits**
  ```bash
  curl -X POST "http://localhost:8080/products/bulk/import?teamId=YOUR_TEAM_ID" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@test-products.csv"
  ```
  - [ ] Statut HTTP 201
  - [ ] Réponse JSON avec `successful: 2`
  - [ ] Réponse JSON avec `failed: 0`
  - [ ] `successfulProducts` array contient 2 produits
  - [ ] Chaque produit contient `id`, `name`, `basePrice`

- [ ] **Vérifier les produits créés**
  ```bash
  curl http://localhost:8080/products?teamId=YOUR_TEAM_ID \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - [ ] Les 2 nouveaux produits sont présents
  - [ ] Les données correspondent au CSV

### Test 3: Export CSV

- [ ] **Exporter les produits**
  ```bash
  curl "http://localhost:8080/products/bulk/export?teamId=YOUR_TEAM_ID" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -o exported.csv
  ```
  - [ ] Statut HTTP 200
  - [ ] Fichier `exported.csv` téléchargé
  - [ ] Fichier contient au moins les 2 produits importés

- [ ] **Vérifier le contenu**
  - [ ] Format CSV valide (colonnes séparées par virgules)
  - [ ] Première ligne: en-têtes
  - [ ] Lignes suivantes: données des produits
  - [ ] Noms et prix correspondent

### Test 4: Gestion des erreurs

- [ ] **Créer un CSV invalide**
  ```csv
  name,basePrice
  Produit Sans Prix,
  ,5000
  Produit Valid,5000
  ```

- [ ] **Import sans skipOnError (par défaut)**
  ```bash
  curl -X POST "http://localhost:8080/products/bulk/import?teamId=YOUR_TEAM_ID" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@invalid.csv"
  ```
  - [ ] Statut HTTP 422 (validation échouée)
  - [ ] Message d'erreur lisible

- [ ] **Import avec skipOnError=true**
  ```bash
  curl -X POST "http://localhost:8080/products/bulk/import?teamId=YOUR_TEAM_ID&skipOnError=true" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@invalid.csv"
  ```
  - [ ] Statut HTTP 200
  - [ ] `successful: 1` (seul le produit valide)
  - [ ] `failed: 2` (deux produits invalides)
  - [ ] Array `errors` contient les détails des erreurs
  - [ ] Chaque erreur a `row` et `errors`

### Test 5: Authentification

- [ ] **Test sans token**
  ```bash
  curl http://localhost:8080/products/bulk/template
  ```
  - [ ] Statut HTTP 401 (Non autorisé) ou 403 (Interdit)

- [ ] **Test avec token invalide**
  ```bash
  curl http://localhost:8080/products/bulk/template \
    -H "Authorization: Bearer invalid_token"
  ```
  - [ ] Statut HTTP 401

## 📝 Phase 4: Tests des Composants

- [ ] **Composant React chargé correctement**
  - [ ] Import du composant sans erreur
  - [ ] Composant render sans erreur

- [ ] **Fonctionnalité de upload**
  - [ ] Bouton "Upload CSV" cliquable
  - [ ] Peut sélectionner un fichier
  - [ ] Affiche le nom du fichier sélectionné

- [ ] **Fonctionnalité de téléchargement du template**
  - [ ] Bouton "Download Template" cliquable
  - [ ] Télécharge le fichier `products-template.csv`

- [ ] **Affichage des résultats**
  - [ ] Après import réussi: affiche le nombre de succès
  - [ ] Affiche la table des produits importés avec succès
  - [ ] Affiche la table des erreurs si présentes

## 🔐 Phase 5: Tests de Sécurité

- [ ] **Limite de taille de fichier**
  - [ ] Créer un fichier CSV > 10MB
  - [ ] Essayer d'importer
  - [ ] Statut HTTP 413 ou erreur appropriée

- [ ] **Type MIME**
  - [ ] Essayer d'importer un fichier .txt
  - [ ] Essayer d'importer un fichier .json
  - [ ] Vérifier que seul CSV fonctionne

- [ ] **Injection SQL/NoSQL**
  - [ ] Ajouter du code malveillant dans les champs
  - [ ] Vérifier que les données sont échappées

## 📊 Phase 6: Performance et Charge

- [ ] **Test avec petit fichier (10 produits)**
  - [ ] Import complété en < 1 seconde
  - [ ] Pas de timeout
  - [ ] Tous les produits créés

- [ ] **Test avec fichier moyen (100 produits)**
  - [ ] Import complété en < 5 secondes
  - [ ] Pas d'erreur mémoire

- [ ] **Test avec grand fichier (1000 produits)**
  - [ ] Import complété en < 30 secondes
  - [ ] Monitorer la mémoire
  - [ ] Vérifier les logs de performance

## 🔄 Phase 7: Tests d'Intégrité

- [ ] **Cycle complet: Import → Export → Import**
  - [ ] Importer CSV 1
  - [ ] Exporter vers CSV 2
  - [ ] Importer CSV 2
  - [ ] Vérifier que les données sont identiques

- [ ] **Update via import**
  - [ ] Créer un produit manuellement
  - [ ] Importer un CSV avec le même produit (ID différent ou même sku)
  - [ ] Vérifier que nouveau produit créé (pas de modification)
  - [ ] Note: L'update n'est pas implémenté par défaut

## 📚 Phase 8: Documentation et Déploiement

- [ ] **Vérifier tous les fichiers de documentation**
  - [ ] `BULK_CSV_IMPORT_EXPORT.md` - API complète ✓
  - [ ] `INSTALLATION_CSV_DEPENDENCIES.md` - Installation ✓
  - [ ] `CSV_IMPLEMENTATION_SUMMARY.md` - Vue d'ensemble ✓
  - [ ] `CSV_IMPLEMENTATION_README.md` - Guide démarrage ✓
  - [ ] `CSV_EXAMPLES.sh` - Exemples de commandes ✓
  - [ ] `CSV_DEPENDENCY_INJECTION_REFACTOR.md` - Refactoring optionnel ✓

- [ ] **Tests unitaires**
  - [ ] Exécuter `pnpm test -- --testPathPattern=product-csv`
  - [ ] Tous les tests passent
  - [ ] Couverture > 80%

- [ ] **Préparer pour production**
  - [ ] Tous les tests passent
  - [ ] Pas d'erreurs dans les logs
  - [ ] Performance acceptable
  - [ ] Sécurité vérifiée

- [ ] **Déploiement**
  - [ ] Commiter les changements
  - [ ] Créer une PR avec description
  - [ ] Faire une review de code
  - [ ] Tester en staging
  - [ ] Déployer en production

## 🎉 Phase 9: Suivi Post-Déploiement

- [ ] **Monitoring**
  - [ ] Vérifier les logs du serveur
  - [ ] Monitorer l'utilisation mémoire
  - [ ] Monitorer le temps de réponse des endpoints

- [ ] **Feedback utilisateurs**
  - [ ] Les administrateurs peuvent importer des produits
  - [ ] Les administrateurs peuvent exporter des produits
  - [ ] L'interface React fonctionne bien
  - [ ] Les erreurs sont claires et utiles

- [ ] **Optimisations futures**
  - [ ] Rate limiting pour les endpoints bulk
  - [ ] Queue asynchrone pour les gros imports
  - [ ] Notifications/webhooks pour les imports
  - [ ] Support des images dans CSV (URLs externes)

## 🔍 Checklist de Vérification Finale

- [ ] ✅ Code implémenté
- [ ] ✅ Tests écrits et passants
- [ ] ✅ Documentation complète
- [ ] ✅ Endpoints testés manuellement
- [ ] ✅ Sécurité vérifiée
- [ ] ✅ Performance acceptable
- [ ] ✅ Composant React intégré (optionnel)
- [ ] ✅ Déploiement en production

---

## 📞 Notes et Points à Clarifier

**Questions à poser au client:**
- [ ] Voulez-vous supporter l'upload d'images dans le CSV?
- [ ] Faut-il implémenter la modification de produits existants (upsert)?
- [ ] Faut-il logger tous les imports/exports?
- [ ] Faut-il ajouter une limite de taux (rate limiting)?
- [ ] Faut-il une queue asynchrone pour les imports massifs?

**Problèmes potentiels:**
- [ ] Catégories doivent exister avant l'import
- [ ] Les images ne sont pas importées (UI séparé)
- [ ] Pas de validation de catégorie pendant l'import
- [ ] Pas de modification de produits (ajout seulement)

---

**Créé:** 2025-07-19  
**Dernier update:** 2025-07-19  
**Statut:** ✅ Prêt pour implémentation
