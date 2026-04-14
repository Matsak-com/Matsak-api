# Notification Module Quick Start Guide

## Setup for Development

1. **Start the required services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d redis mailhog
   ```

2. **Access MailHog Web UI:**
   - Open http://localhost:8025 in your browser
   - All emails sent in development will appear here

## Quick Usage

### Inject the Service

```typescript
import { NotificationService } from './notifications/notification.service';

constructor(private readonly notificationService: NotificationService) {}
```

### Send an Email

```typescript
// Using a template
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  context: { name: 'John', loginUrl: 'https://matsak.com/login' },
});

// Using HTML
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Hello!</h1>',
});
```

### Schedule an Email

```typescript
const sendAt = new Date(Date.now() + 3600000); // Send in 1 hour

await this.notificationService.scheduleEmail({
  to: 'user@example.com',
  subject: 'Reminder',
  template: 'reminder',
  context: { eventName: 'Meeting' },
  sendAt,
});
```

### Send SMS (placeholder)

```typescript
await this.notificationService.sendSms({
  to: '+1234567890',
  message: 'Your code is: 123456',
});
```

## Available Templates

- `welcome` - Welcome new users
- `reset-password` - Password reset emails
- `verify-email` - Email verification
- `order-confirmation` - Order confirmations

## Testing

Run the notification tests:
```bash
npm run test:notifications
```

Run unit tests:
```bash
npm test -- --testPathPattern=notifications
```

## Environment Variables

Required for production:
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=true
MAIL_USER=apikey
MAIL_PASS=your-api-key
MAIL_FROM="Matsak <noreply@matsak.com>"
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## Common Scenarios

### User Registration
```typescript
await this.notificationService.sendEmail({
  to: user.email,
  subject: 'Welcome to Matsak',
  template: 'welcome',
  context: {
    name: user.name,
    loginUrl: 'https://matsak.com/login',
  },
});
```

### Password Reset
```typescript
await this.notificationService.sendEmail({
  to: user.email,
  subject: 'Reset Your Password',
  template: 'reset-password',
  context: {
    name: user.name,
    resetUrl: `https://matsak.com/reset?token=${token}`,
    expiryTime: 24,
  },
});
```

### Order Confirmation
```typescript
await this.notificationService.sendEmail({
  to: customer.email,
  subject: `Order Confirmation #${order.number}`,
  template: 'order-confirmation',
  context: {
    name: customer.name,
    orderNumber: order.number,
    items: order.items,
    total: order.total,
    orderUrl: `https://matsak.com/orders/${order.number}`,
  },
});
```

## Troubleshooting

**Emails not appearing in MailHog?**
- Check if MailHog is running: `docker ps | grep mailhog`
- Verify MAIL_HOST=localhost and MAIL_PORT=1025 in your .env

**Scheduled emails not sending?**
- Ensure Redis is running: `docker ps | grep redis`
- Check application logs for queue errors

**Template not found?**
- Templates are in `src/notifications/templates/`
- Ensure template name matches file name (without .hbs)

## More Information

See [NOTIFICATION_MODULE.md](./NOTIFICATION_MODULE.md) for complete documentation.
