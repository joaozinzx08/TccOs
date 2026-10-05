import nodemailer from 'nodemailer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
export function mailer({ directory, env = process.env }) {
  return async ({ to, subject, text }) => {
    if (env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });
      await transport.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, text });
    } else if (env.NODE_ENV !== 'production') {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      writeFileSync(
        path.join(directory, randomUUID() + '.json'),
        JSON.stringify({ to, subject, text, data: new Date().toISOString() }, null, 2),
        { mode: 0o600 },
      );
      console.log(
        'E-mail de desenvolvimento gravado em backend/data/outbox. Nenhum e-mail externo foi enviado.',
      );
    } else
      throw Object.assign(Error('Envio de e-mail indisponível. Contate o administrador.'), {
        status: 503,
      });
  };
}
