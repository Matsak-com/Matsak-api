import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notifications/notification.service';

/**
 * Example service demonstrating how to use the Notification Module
 * in real-world scenarios within the Matsak API.
 */
@Injectable()
export class ExampleUsageService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Example 1: Send welcome email when a user signs up
   */
  async sendWelcomeEmail(userName: string, userEmail: string) {
    await this.notificationService.sendEmail({
      to: userEmail,
      subject: 'Welcome to Matsak!',
      template: 'welcome',
      context: {
        name: userName,
        loginUrl: 'https://matsak.com/login',
      },
    });
  }

  /**
   * Example 2: Send password reset email
   */
  async sendPasswordResetEmail(
    userName: string,
    userEmail: string,
    resetToken: string,
  ) {
    const resetUrl = `https://matsak.com/reset-password?token=${resetToken}`;

    await this.notificationService.sendEmail({
      to: userEmail,
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: {
        name: userName,
        resetUrl,
        expiryTime: 24,
      },
    });
  }

  /**
   * Example 3: Send email verification
   */
  async sendEmailVerification(
    userName: string,
    userEmail: string,
    verificationToken: string,
  ) {
    const verificationUrl = `https://matsak.com/verify-email?token=${verificationToken}`;

    await this.notificationService.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email',
      template: 'verify-email',
      context: {
        name: userName,
        verificationUrl,
        expiryTime: 48,
      },
    });
  }

  /**
   * Example 4: Send order confirmation with scheduled reminder
   */
  async sendOrderConfirmation(
    customerName: string,
    customerEmail: string,
    orderNumber: string,
    items: Array<{ name: string; quantity: number; price: string }>,
    total: string,
  ) {
    // Send immediate confirmation
    await this.notificationService.sendEmail({
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber}`,
      template: 'order-confirmation',
      context: {
        name: customerName,
        orderNumber,
        items,
        total,
        orderUrl: `https://matsak.com/orders/${orderNumber}`,
      },
    });

    // Schedule a follow-up email in 7 days
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);

    await this.notificationService.scheduleEmail({
      to: customerEmail,
      subject: 'How was your order?',
      html: `
        <h2>Hi ${customerName},</h2>
        <p>We hope you enjoyed your order #${orderNumber}!</p>
        <p>We'd love to hear your feedback.</p>
        <a href="https://matsak.com/review/${orderNumber}">Leave a Review</a>
      `,
      sendAt: followUpDate,
    });
  }

  /**
   * Example 5: Send SMS notification (when SMS provider is configured)
   */
  async sendOrderStatusSms(phoneNumber: string, orderNumber: string) {
    await this.notificationService.sendSms({
      to: phoneNumber,
      message: `Your Matsak order #${orderNumber} has been shipped!`,
    });
  }

  /**
   * Example 6: Send bulk email to multiple users
   */
  async sendBulkAnnouncement(userEmails: string[], announcement: string) {
    // For large lists, consider batching
    const batchSize = 50;
    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize);

      await this.notificationService.sendEmail({
        to: batch,
        subject: 'Important Announcement from Matsak',
        html: `
          <h2>Important Announcement</h2>
          <p>${announcement}</p>
        `,
      });
    }
  }

  /**
   * Example 7: Send custom HTML email with attachments
   */
  async sendInvoiceEmail(
    customerEmail: string,
    invoicePath: string,
    invoiceNumber: string,
  ) {
    await this.notificationService.sendEmail({
      to: customerEmail,
      subject: `Invoice #${invoiceNumber}`,
      html: `
        <h2>Your Invoice is Ready</h2>
        <p>Thank you for your business. Please find your invoice attached.</p>
        <p>Invoice Number: ${invoiceNumber}</p>
      `,
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          path: invoicePath,
        },
      ],
    });
  }

  /**
   * Example 8: Schedule email for a specific time (e.g., promotional campaign)
   */
  async schedulePromotionalEmail(
    userEmail: string,
    userName: string,
    sendDate: Date,
  ) {
    await this.notificationService.scheduleEmail({
      to: userEmail,
      subject: 'Special Offer Just for You!',
      html: `
        <h2>Hi ${userName}!</h2>
        <p>We have a special offer just for you!</p>
        <p>Use code SPECIAL20 for 20% off your next order.</p>
        <a href="https://matsak.com/shop">Shop Now</a>
      `,
      sendAt: sendDate,
    });
  }
}
