import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { UsersService } from '../../../users/users.service';
import * as promptLib from 'prompt';
import * as bcrypt from 'bcrypt';

interface PasswordChangeInput {
  email: string;
  newPassword: string;
  confirmPassword: string;
  confirm: string;
}

async function main() {
  const program = new Command();

  program
    .command('change-user-password')
    .description('Change user password interactively')
    .action(async () => {
      console.log('🔐 Gestionnaire de changement de mot de passe utilisateur');
      console.log('================================================\n');

      const app = await NestFactory.createApplicationContext(AppModule);
      const userService = app.get(UsersService);

      try {
        await changeUserPasswordInteractive(userService);
      } catch (error) {
        console.error('❌ Erreur:', (error as Error).message || error);
      } finally {
        await app.close();
      }
    });

  // Default command handler
  program.command('*').action(() => {
    console.log(
      '🎯 Commande non reconnue. Utilisez --help pour obtenir la liste des commandes disponibles.',
    );
  });

  // Parse command line arguments
  program.parse(process.argv);
}

async function changeUserPasswordInteractive(userService: UsersService) {
  promptLib.start();

  // Step 1: Get user email
  console.log("📌 Étape 1: Identification de l'utilisateur");
  const userEmailInput = await promptForUserInput({
    properties: {
      email: {
        description: "Entrez l'adresse email de l'utilisateur",
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Veuillez entrer une adresse email valide',
        required: true,
      },
    },
  });

  // Step 2: Verify user exists and display info
  console.log("\n🔍 Recherche de l'utilisateur...");
  let user;
  try {
    user = await userService.findByEmail(userEmailInput.email);
    if (!user) {
      throw new Error(
        `Utilisateur non trouvé avec l'email: ${userEmailInput.email}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Utilisateur non trouvé avec l'email: ${userEmailInput.email}`,
    );
  }

  console.log('\n✅ Utilisateur trouvé:');
  console.log(`   - ID: ${user._id}`);
  console.log(`   - Nom: ${user.name || 'N/A'}`);
  console.log(`   - Prénom: ${user.firstname || 'N/A'}`);
  console.log(`   - Email: ${user.email}`);

  // Step 3: Confirm action
  console.log("\n📌 Étape 2: Confirmation de l'action");
  const confirmAction = await promptForUserInput({
    properties: {
      confirm: {
        description:
          'Voulez-vous vraiment changer le mot de passe de cet utilisateur? (oui/non)',
        pattern: /^(oui|non|o|n|yes|no|y|n)$/i,
        message: 'Veuillez répondre par "oui" ou "non"',
        required: true,
      },
    },
  });

  if (!['oui', 'o', 'yes', 'y'].includes(confirmAction.confirm.toLowerCase())) {
    console.log("❌ Opération annulée par l'utilisateur.");
    return;
  }

  // Step 4: Get new password
  console.log('\n📌 Étape 3: Définition du nouveau mot de passe');
  const passwordInput = await promptForUserInput({
    properties: {
      newPassword: {
        description: 'Entrez le nouveau mot de passe (minimum 8 caractères)',
        hidden: true,
        replace: '*',
        message: 'Le mot de passe doit contenir au moins 8 caractères',
        conform: (value: string) => value.length >= 8,
        required: true,
      },
      confirmPassword: {
        description: 'Confirmez le nouveau mot de passe',
        hidden: true,
        replace: '*',
        required: true,
      },
    },
  });

  // Step 5: Validate password confirmation
  if (passwordInput.newPassword !== passwordInput.confirmPassword) {
    throw new Error(
      'Les mots de passe ne correspondent pas. Opération annulée.',
    );
  }

  // Step 6: Final confirmation
  console.log('\n📌 Étape 4: Confirmation finale');
  const finalConfirm = await promptForUserInput({
    properties: {
      finalConfirm: {
        description: 'Confirmer le changement de mot de passe? (oui/non)',
        pattern: /^(oui|non|o|n|yes|no|y|n)$/i,
        message: 'Veuillez répondre par "oui" ou "non"',
        required: true,
      },
    },
  });

  if (
    !['oui', 'o', 'yes', 'y'].includes(finalConfirm.finalConfirm.toLowerCase())
  ) {
    console.log("❌ Opération annulée par l'utilisateur.");
    return;
  }

  // Step 7: Update password
  console.log('\n🔄 Mise à jour du mot de passe...');

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(passwordInput.newPassword, 10);

    // Update user directly with the new hashed password
    await userService.update(
      { email: userEmailInput.email },
      { password: hashedPassword },
    );

    console.log('\n✅ Mot de passe changé avec succès!');
    console.log(`   - Utilisateur: ${user.email}`);
    console.log(`   - Date: ${new Date().toLocaleString('fr-FR')}`);
    console.log(
      "\n🔐 L'utilisateur peut maintenant se connecter avec son nouveau mot de passe.",
    );
  } catch (error) {
    throw new Error(
      `Erreur lors de la mise à jour du mot de passe: ${(error as Error).message}`,
    );
  }
}

function promptForUserInput(schema: any): Promise<any> {
  return new Promise((resolve, reject) => {
    promptLib.get(schema, (err: any, result: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}
