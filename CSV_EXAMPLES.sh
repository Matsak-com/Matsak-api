#!/bin/bash

# ============================================================================
# CSV Bulk Import/Export - Exemples d'utilisation pratiques
# ============================================================================
# Exécutez les commandes ci-dessous pour tester l'API
# Modifiez les variables: TOKEN, TEAM_ID selon vos besoins

# ============================================================================
# Configuration
# ============================================================================

# URL de base de l'API
API_BASE_URL="http://localhost:8080"

# Token JWT (remplacez par un vrai token)
TOKEN="your_jwt_token_here"

# ID de l'équipe (remplacez par un vrai ID)
TEAM_ID="507f1f77bcf86cd799439011"

# Fichier d'entrée/sortie
INPUT_CSV="products.csv"
TEMPLATE_CSV="products-template.csv"
OUTPUT_CSV="products-export.csv"

# ============================================================================
# 1. TÉLÉCHARGER LE TEMPLATE CSV
# ============================================================================

echo "📥 Téléchargement du template CSV..."
curl -X GET "${API_BASE_URL}/products/bulk/template" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o "${TEMPLATE_CSV}" \
  -v

echo "✓ Template téléchargé: ${TEMPLATE_CSV}"
echo ""

# ============================================================================
# 2. EXEMPLE: Créer un CSV d'import
# ============================================================================

echo "📝 Création d'un fichier CSV d'exemple..."

cat > "${INPUT_CSV}" << 'EOF'
name,description,basePrice,currency,categoryName,sku,stockQuantity,isActive,discountType,discountValue
Paracetamol 500mg,Comprimés pour la douleur et la fièvre,5000,MGA,Médicaments,PARA500,100,true,percentage,10
Antibiotique Amoxicilline,Traitement d'infections,8000,MGA,Médicaments,AMOX500,50,true,fixed,1000
Vitamine C 1000mg,Complément vitaminé,3500,MGA,Vitamines,VIT-C,200,true,percentage,5
Sirop Rhume,Traitement des symptômes du rhume,4500,MGA,Sirops,RHUME-SYRUP,75,true,,
Masque Chirurgical,Boîte de 50 masques,7500,MGA,Équipement,MASK-50,500,true,bulk,0.15
EOF

echo "✓ Fichier CSV créé: ${INPUT_CSV}"
echo ""

# ============================================================================
# 3. IMPORTER LES PRODUITS DEPUIS LE CSV
# ============================================================================

echo "📤 Import des produits depuis ${INPUT_CSV}..."
curl -X POST "${API_BASE_URL}/products/bulk/import?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${INPUT_CSV}" \
  -v

echo ""
echo ""

# ============================================================================
# 4. EXPORTER TOUS LES PRODUITS
# ============================================================================

echo "📥 Export des produits..."
curl -X GET "${API_BASE_URL}/products/bulk/export?teamId=${TEAM_ID}&includeDiscounts=true" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o "${OUTPUT_CSV}" \
  -v

echo "✓ Produits exportés: ${OUTPUT_CSV}"
echo ""

# ============================================================================
# 5. IMPORTER AVEC SKIP ON ERROR
# ============================================================================

echo "📤 Import avec gestion des erreurs (skipOnError=true)..."
curl -X POST "${API_BASE_URL}/products/bulk/import?teamId=${TEAM_ID}&skipOnError=true" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${INPUT_CSV}" \
  -v

echo ""
echo ""

# ============================================================================
# 6. VÉRIFIER LES RÉSULTATS
# ============================================================================

echo "📊 Affichage des résultats d'import..."
cat "${INPUT_CSV}"
echo ""
echo "---"
echo ""

# ============================================================================
# EXEMPLES DE COMMANDES INDIVIDUELLES
# ============================================================================

# ============================================================================
# A. Télécharger le template
# ============================================================================

# curl -X GET "http://localhost:3000/products/bulk/template" \
#   -H "Authorization: Bearer YOUR_TOKEN" \
#   -o template.csv

# ============================================================================
# B. Importer avec options
# ============================================================================

# # Import basique
# curl -X POST "http://localhost:3000/products/bulk/import?teamId=507f1f77bcf86cd799439011" \
#   -H "Authorization: Bearer YOUR_TOKEN" \
#   -F "file=@products.csv"

# # Import avec skipOnError
# curl -X POST "http://localhost:3000/products/bulk/import?teamId=507f1f77bcf86cd799439011&skipOnError=true" \
#   -H "Authorization: Bearer YOUR_TOKEN" \
#   -F "file=@products.csv"

# ============================================================================
# C. Exporter avec options
# ============================================================================

# # Export basique
# curl -X GET "http://localhost:3000/products/bulk/export?teamId=507f1f77bcf86cd799439011" \
#   -H "Authorization: Bearer YOUR_TOKEN" \
#   -o products.csv

# # Export avec remises et images
# curl -X GET "http://localhost:3000/products/bulk/export?teamId=507f1f77bcf86cd799439011&includeDiscounts=true&includeImages=true" \
#   -H "Authorization: Bearer YOUR_TOKEN" \
#   -o products-full.csv

# ============================================================================
# GESTION DES ERREURS
# ============================================================================

# Erreur 401: Token invalide ou expiré
# Solution: Récupérer un nouveau token d'authentification

# Erreur 400: Paramètres invalides
# Solutions:
#   - Vérifier que teamId est un ObjectId valide
#   - Vérifier le format du fichier CSV
#   - Vérifier les paramètres de query string

# Erreur 413: Fichier trop volumineux
# Solution: Limiter la taille du fichier à < 10MB

# Erreur 422: Validation échouée
# Solution: Vérifier les données CSV et utiliser skipOnError=true pour continuer

# ============================================================================
# TIPS & TRICKS
# ============================================================================

# 1. Convertir un fichier Excel en CSV:
#    LibreOffice: Enregistrer sous > Format CSV
#    Google Sheets: Fichier > Télécharger > CSV
#    Excel: Enregistrer sous > Format CSV UTF-8

# 2. Vérifier le format CSV en ligne:
#    https://www.csvvalidator.com/

# 3. Formater un CSV en ligne de commande:
#    column -t -s',' products.csv | head -20

# 4. Compter les lignes du CSV:
#    wc -l products.csv

# 5. Extraire les colonnes du CSV:
#    cut -d',' -f1,2 products.csv

# 6. Filtrer les erreurs d'import:
#    grep "error" import-response.json

# 7. Convertir JSON en CSV (avec jq):
#    jq -r '.successfulProducts[] | [.id, .name, .basePrice] | @csv' > output.csv

echo "✓ Tous les exemples sont prêts!"
