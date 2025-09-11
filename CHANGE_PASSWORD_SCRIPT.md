# Change User Password Script

This script provides an interactive way to change a user's password in the Matsak API system.

## Usage

```bash
pnpm run change-user-password
```

## Features

The script provides a step-by-step interactive process:

### Step 1: User Identification
- Prompts for user email address
- Validates the email format

### Step 2: User Verification
- Searches for the user in the database
- Displays user information for confirmation:
  - User ID
  - Name
  - First name  
  - Email address

### Step 3: Action Confirmation
- Asks for confirmation before proceeding
- Accepts: `oui`, `o`, `yes`, `y` (case insensitive)

### Step 4: New Password Input
- Prompts for new password (minimum 8 characters)
- Password input is hidden (shown as asterisks)
- Validates password length

### Step 5: Password Confirmation
- Asks to re-enter the password for confirmation
- Validates that both passwords match

### Step 6: Final Confirmation
- Last chance to confirm the password change
- Accepts: `oui`, `o`, `yes`, `y` (case insensitive)

### Step 7: Password Update
- Hashes the new password using bcrypt
- Updates the user record in the database
- Provides success confirmation with timestamp

## Error Handling

The script handles various error scenarios:
- User not found
- Password mismatch
- Database connection errors
- Invalid input formats
- User cancellation at any step

## Security Features

- Password hashing using bcrypt with salt rounds (10)
- Hidden password input (asterisks)
- Multiple confirmation steps
- Comprehensive error messages

## Sample Output

```
🔐 Gestionnaire de changement de mot de passe utilisateur
================================================

📌 Étape 1: Identification de l'utilisateur
prompt: Entrez l'adresse email de l'utilisateur: jean.dupont@example.com

🔍 Recherche de l'utilisateur...

✅ Utilisateur trouvé:
   - Email: jean.dupont@example.com
   - Nom: Dupont
   - Prénom: Jean

📌 Étape 2: Confirmation de l'action
prompt: Voulez-vous vraiment changer le mot de passe de cet utilisateur? (oui/non): oui

📌 Étape 3: Définition du nouveau mot de passe
prompt: Entrez le nouveau mot de passe (minimum 8 caractères): ********
prompt: Confirmez le nouveau mot de passe: ********

📌 Étape 4: Confirmation finale
prompt: Confirmer le changement de mot de passe? (oui/non): oui

🔄 Mise à jour du mot de passe...

✅ Mot de passe changé avec succès!
   - Utilisateur: jean.dupont@example.com
   - Date: 22/08/2025 à 09:45:30

🔐 L'utilisateur peut maintenant se connecter avec son nouveau mot de passe.
```

## Requirements

- Node.js and pnpm installed
- MongoDB database connection configured
- Required dependencies:
  - commander
  - prompt
  - bcrypt
  - @nestjs/core