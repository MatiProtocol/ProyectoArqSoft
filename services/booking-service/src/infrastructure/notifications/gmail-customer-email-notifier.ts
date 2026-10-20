import { ErrorFactory } from '@move/errors-lib';
import nodemailer from 'nodemailer';
import type {
  BookingRejectedEmail,
  CustomerEmailNotifier,
} from '../../application/contracts/customer-email-notifier';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { GmailConfig } from '../config/gmail';

type OAuth2Client = {
  setCredentials(credentials: { refresh_token: string }): void;
  getAccessToken(): Promise<{ token?: string | null }>;
};

type GoogleApis = {
  google: {
    auth: {
      OAuth2: new (clientId: string, clientSecret: string, redirectUri: string) => OAuth2Client;
    };
  };
};

type GmailTransportOptions = {
  service: 'gmail';
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  auth: {
    type: 'OAuth2';
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken: string;
  };
};

type Mailer = {
  createTransport(options: GmailTransportOptions): nodemailer.Transporter;
};

export class GmailCustomerEmailNotifier implements CustomerEmailNotifier {
  private readonly oauth2Client: OAuth2Client;
  private readonly gmailBreaker: ExternalServiceCircuitBreaker<[BookingRejectedEmail], void>;

  constructor(
    private readonly config: GmailConfig,
    googleApis: GoogleApis = require('googleapis') as GoogleApis,
    private readonly mailer: Mailer = nodemailer
  ) {
    this.oauth2Client = new googleApis.google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });
    this.gmailBreaker = createExternalServiceCircuitBreaker(
      (payload: BookingRejectedEmail) => this.sendBookingRejectedEmail(payload),
      {
        name: 'gmail',
        serviceName: 'Gmail',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'Gmail email service is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async notifyBookingRejected(payload: BookingRejectedEmail): Promise<void> {
    return this.gmailBreaker.fire(payload);
  }

  private async sendBookingRejectedEmail(payload: BookingRejectedEmail): Promise<void> {
    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
        from: `"Equipo MOVE" <${this.config.user}>`,
        to: payload.to,
        subject: payload.subject,
        html: this.createRejectedBookingHtml(payload),
      });
    } catch (error) {
      throw ErrorFactory.externalService(
        'Gmail',
        error instanceof Error ? error.message : 'Gmail email could not be sent',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async createTransporter(): Promise<nodemailer.Transporter> {
    const { token: accessToken } = await this.oauth2Client.getAccessToken();

    if (!accessToken) {
      throw new Error('Gmail OAuth returned no access token');
    }

    return this.mailer.createTransport({
      service: 'gmail',
      connectionTimeout: this.config.timeoutMs,
      greetingTimeout: this.config.timeoutMs,
      socketTimeout: this.config.timeoutMs,
      auth: {
        type: 'OAuth2',
        user: this.config.user,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        refreshToken: this.config.refreshToken,
        accessToken,
      },
    });
  }

  private createRejectedBookingHtml(payload: BookingRejectedEmail): string {
    const paragraphs = payload.bodyText
      .split('\n\n')
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
      .join('');

    return `<div style="font-family: Arial, sans-serif; max-width: 600px;">${paragraphs}</div>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
