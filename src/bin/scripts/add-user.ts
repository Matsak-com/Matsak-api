import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';

const program = new Command();

program
  .command('add-user')
  .description('Ajoute un utilisateur dans la base de données')
  .requiredOption('-n, --name <name>', "Nom de l'utilisateur")
  .requiredOption('-f, --firstname <firstname>', "Prénom de l'utilisateur")
  .requiredOption('-e, --email <email>', "Email de l'utilisateur")
  .requiredOption('-p, --password <password>', "Mot de passe de l'utilisateur")
  .option('-r, --role <role>', "Rôle de l'utilisateur (user/admin)", 'user')
  .option(
    '--isResettingPassword',
    "Indique si l'utilisateur réinitialise son mot de passe",
    false,
  )
  .option(
    '--resetPasswordToken <token>',
    'Token de réinitialisation du mot de passe',
  )
  .option('--avatarFileKey <key>', 'Clé du fichier avatar')
  .action(async (options) => {
    // Vérification du rôle
    if (!['user', 'admin'].includes(options.role)) {
      console.error('❌ Rôle invalide. Utilisez "user" ou "admin".');
      process.exit(1);
    }

    const app = await NestFactory.createApplicationContext(AppModule);
    const userService = app.get(UsersService);

    try {
      const createUserDto = {
        name: options.name,
        firstname: options.firstname,
        email: options.email,
        password: options.password,
        role: options.role, // Utilisation de role sans casting
        isResettingPassword: Boolean(options.isResettingPassword),
        resetPasswordToken: options.resetPasswordToken || null,
        avatarFileKey: options.avatarFileKey || null,
      };

      console.log('📌 Données utilisateur :', createUserDto);

      const user = await userService.create(createUserDto);
      console.log(`✅ Utilisateur ajouté avec succès : ${user.email}`);
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout de l'utilisateur", error);
    } finally {
      await app.close();
    }
  });

// Commande par défaut
program.command('*').action(() => {
  console.log(
    '🎯 Commande non reconnue. Utilisez --help pour obtenir la liste des commandes disponibles.',
  );
});

// Ajout de parse pour exécuter la commande
program.parse(process.argv);
