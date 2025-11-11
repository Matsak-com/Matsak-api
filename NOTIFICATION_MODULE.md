# Notification Module

The Notification Module provides a comprehensive solution for managing email and SMS notifications in the Matsak API. It includes support for template-based emails, scheduled sending, and extensible provider architecture.

## Features

- **Email Notifications**: Send emails using templates or raw HTML/text
- **SMS Notifications**: Placeholder for SMS provider integration (e.g., Twilio)
- **Template System**: Handlebars-based email templates with layouts
- **Scheduled Sending**: Queue notifications to be sent at a specific time
- **MailHog Integration**: Email testing in development environment
- **Job Queue**: Bull-based job queue with Redis for reliable delivery

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_SECURE=false
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM="Matsak <noreply@matsak.com>"

# Redis Configuration (for job queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# SMS Configuration (future implementation)
# SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### Development Setup with Docker

The development environment includes MailHog for testing email functionality:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- MongoDB on port 27018
- MailHog SMTP on port 1025
- MailHog Web UI on port 8025 (http://localhost:8025)
- Redis on port 6379
- API on port 8080

## Usage

### Injecting the Service

```typescript
import { NotificationService } from './notifications/notification.service';

@Injectable()
export class YourService {
  constructor(private readonly notificationService: NotificationService) {}
}
```

### Sending Emails

#### Using Templates

```typescript
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Matsak',
  template: 'welcome',
  context: {
    name: 'John Doe',
    loginUrl: 'https://matsak.com/login',
  },
});
```

#### Using HTML

```typescript
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Email',
  html: '<h1>Hello!</h1><p>This is a custom email.</p>',
});
```

#### Using Plain Text

```typescript
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Simple Email',
  text: 'This is a plain text email.',
});
```

#### Multiple Recipients

```typescript
await this.notificationService.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Announcement',
  template: 'announcement',
  context: { message: 'Important update' },
});
```

#### With Attachments

```typescript
await this.notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Invoice',
  template: 'invoice',
  context: { invoiceNumber: '12345' },
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf',
    },
  ],
});
```

### Scheduling Emails

```typescript
const sendAt = new Date(Date.now() + 3600000); // Send in 1 hour

await this.notificationService.scheduleEmail({
  to: 'user@example.com',
  subject: 'Scheduled Email',
  template: 'reminder',
  context: { eventName: 'Meeting' },
  sendAt,
});
```

### Sending SMS

```typescript
await this.notificationService.sendSms({
  to: '+1234567890',
  message: 'Your verification code is: 123456',
});
```

### Scheduling SMS

```typescript
const sendAt = new Date(Date.now() + 3600000); // Send in 1 hour

await this.notificationService.scheduleSms({
  to: '+1234567890',
  message: 'Reminder: Your appointment is tomorrow',
  sendAt,
});
```

## Available Email Templates

The module includes the following pre-built templates:

### 1. Welcome Email (`welcome.hbs`)

Context variables:
- `name`: User's name
- `loginUrl`: URL to login page

### 2. Password Reset (`reset-password.hbs`)

Context variables:
- `name`: User's name
- `resetUrl`: Password reset URL
- `expiryTime`: Hours until link expires

### 3. Email Verification (`verify-email.hbs`)

Context variables:
- `name`: User's name
- `verificationUrl`: Email verification URL
- `expiryTime`: Hours until link expires

### 4. Order Confirmation (`order-confirmation.hbs`)

Context variables:
- `name`: Customer's name
- `orderNumber`: Order number
- `items`: Array of order items (name, quantity, price)
- `total`: Total order amount
- `orderUrl`: URL to view order details

## Creating Custom Templates

Create a new `.hbs` file in `src/notifications/templates/`:

```handlebars
<h2>{{title}}</h2>
<p>Hello {{name}},</p>
<p>{{message}}</p>
<a href="{{actionUrl}}" class="button">{{actionText}}</a>
<p>Best regards,<br>The Matsak Team</p>
```

The template will automatically use the default layout which includes the Matsak branding and footer.

## API Endpoints

### POST /api/notifications/email

Send an email immediately.

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Test Email",
  "template": "welcome",
  "context": {
    "name": "John Doe",
    "loginUrl": "https://matsak.com/login"
  }
}
```

**Response:**
```json
{
  "message": "Email sent successfully"
}
```

### POST /api/notifications/sms

Send an SMS immediately.

**Request Body:**
```json
{
  "to": "+1234567890",
  "message": "Your verification code is: 123456"
}
```

**Response:**
```json
{
  "message": "SMS sent successfully"
}
```

## Adding Custom Email Providers

To add a custom email provider:

1. Create a new provider class implementing `IEmailProvider`:

```typescript
import { Injectable } from '@nestjs/common';
import { IEmailProvider } from '../interfaces/notification-provider.interface';
import { EmailOptions } from '../interfaces/email-options.interface';

@Injectable()
export class CustomEmailProvider implements IEmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    // Your custom implementation
  }
}
```

2. Update the `NotificationModule` to use your custom provider:

```typescript
providers: [
  NotificationService,
  NotificationProcessor,
  {
    provide: EmailProvider,
    useClass: CustomEmailProvider,
  },
  SmsProvider,
],
```

## Adding SMS Providers

To implement SMS functionality with a provider like Twilio:

1. Install the provider SDK:
```bash
npm install twilio --save
```

2. Update `sms.provider.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { SmsOptions } from '../interfaces/sms-options.interface';
import { ISmsProvider } from '../interfaces/notification-provider.interface';

@Injectable()
export class SmsProvider implements ISmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly twilioClient: Twilio;

  constructor() {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendSms(options: SmsOptions): Promise<void> {
    try {
      const { to, message } = options;
      const recipients = Array.isArray(to) ? to : [to];

      for (const recipient of recipients) {
        await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipient,
        });
      }

      this.logger.log(`SMS sent successfully to ${recipients.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## Testing

### Unit Tests

Run the notification service tests:

```bash
npm test -- notification.service.spec.ts
```

### Testing with MailHog

1. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Access MailHog Web UI at http://localhost:8025

3. Send a test email through the API or service

4. View the received email in MailHog

## Production Configuration

For production, configure your email settings to use a real SMTP server:

```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=true
MAIL_USER=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_FROM="Matsak <noreply@matsak.com>"
```

Popular email service providers:
- **SendGrid**: smtp.sendgrid.net:587
- **Mailgun**: smtp.mailgun.org:587
- **AWS SES**: email-smtp.us-east-1.amazonaws.com:587
- **Gmail**: smtp.gmail.com:587

## Troubleshooting

### Emails not sending in development

1. Check that MailHog is running: `docker ps | grep mailhog`
2. Verify environment variables are set correctly
3. Check MailHog logs: `docker logs matsak-mailhog-dev`

### Scheduled emails not being sent

1. Check that Redis is running: `docker ps | grep redis`
2. Verify Redis connection in application logs
3. Check Bull queue status through logs

### Template not found errors

1. Ensure template files exist in `src/notifications/templates/`
2. Check that template file names match the template parameter
3. Verify the template directory path in `notification.module.ts`

## Future Enhancements

- [ ] Add support for email tracking (opens, clicks)
- [ ] Implement retry logic for failed sends
- [ ] Add support for bulk email sending
- [ ] Implement SMS provider integration (Twilio, AWS SNS)
- [ ] Add email queue monitoring dashboard
- [ ] Support for internationalization in templates
- [ ] Add support for inline CSS in templates
- [ ] Implement rate limiting for email/SMS sending
