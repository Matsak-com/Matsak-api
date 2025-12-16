// MongoDB initialization script
// Creates application database and user with appropriate permissions

// Switch to the matsak database
db = db.getSiblingDB('matsak');

// Get credentials from environment variables
const appUsername = process.env.MONGO_APP_USERNAME || 'matsak_user';
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!appPassword) {
    throw new Error('MONGO_APP_PASSWORD environment variable is required');
}

// Create application user with read/write permissions on matsak database
db.createUser({
    user: appUsername,
    pwd: appPassword,
    roles: [
        {
            role: 'readWrite',
            db: 'matsak'
        }
    ]
});

print(`Created user ${appUsername} with readWrite permissions on matsak database`);