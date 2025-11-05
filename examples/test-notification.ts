#!/usr/bin/env node

/**
 * Script to test the notification module
 * 
 * Usage:
 *   npm run build
 *   node dist/examples/test-notification.js
 * 
 * Prerequisites:
 *   - Redis must be running (for scheduled emails)
 *   - MailHog must be running (for email capture in dev)
 *   
 * With Docker:
 *   docker-compose -f docker-compose.dev.yml up -d redis mailhog
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NotificationService } from '../src/notifications/notification.service';

async function testNotifications() {
  console.log('🚀 Starting Notification Module Test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);

  try {
    // Test 1: Simple text email
    console.log('📧 Test 1: Sending simple text email...');
    await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email - Plain Text',
      text: 'This is a plain text test email from Matsak API.',
    });
    console.log('✅ Simple text email sent successfully!\n');

    // Test 2: HTML email
    console.log('📧 Test 2: Sending HTML email...');
    await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email - HTML',
      html: '<h1>Hello from Matsak!</h1><p>This is an <strong>HTML</strong> email.</p>',
    });
    console.log('✅ HTML email sent successfully!\n');

    // Test 3: Template-based email (welcome)
    console.log('📧 Test 3: Sending template-based welcome email...');
    await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Welcome to Matsak!',
      template: 'welcome',
      context: {
        name: 'Test User',
        loginUrl: 'https://matsak.com/login',
      },
    });
    console.log('✅ Welcome email sent successfully!\n');

    // Test 4: Template-based email (reset password)
    console.log('📧 Test 4: Sending password reset email...');
    await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: {
        name: 'Test User',
        resetUrl: 'https://matsak.com/reset?token=abc123',
        expiryTime: 24,
      },
    });
    console.log('✅ Password reset email sent successfully!\n');

    // Test 5: Scheduled email (1 minute from now)
    console.log('📧 Test 5: Scheduling email to be sent in 1 minute...');
    const scheduledTime = new Date(Date.now() + 60000);
    await notificationService.scheduleEmail({
      to: 'test@example.com',
      subject: 'Scheduled Email',
      text: 'This email was scheduled to be sent 1 minute after the test started.',
      sendAt: scheduledTime,
    });
    console.log(
      `✅ Email scheduled successfully for ${scheduledTime.toISOString()}!\n`,
    );

    // Test 6: SMS (placeholder - will just log)
    console.log('📱 Test 6: Sending SMS (placeholder)...');
    await notificationService.sendSms({
      to: '+1234567890',
      message: 'This is a test SMS from Matsak API.',
    });
    console.log('✅ SMS logged successfully!\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📬 Check MailHog at http://localhost:8025 to view emails');
    console.log('⏰ Scheduled email will be sent in 1 minute\n');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

testNotifications().catch((error) => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});
