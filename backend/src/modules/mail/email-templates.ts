import { hostname } from 'os';

export type EmailTemplateParams = {
  appUrl: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  footerNote?: string;
};

function layout(params: EmailTemplateParams): { html: string; text: string } {
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const host = hostname();

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1d4ed8;padding:20px 24px;color:#ffffff;">
              <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">MED-ЛОГИСТИКА</div>
              <div style="font-size:20px;font-weight:700;margin-top:4px;">${params.title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#0f172a;font-size:15px;line-height:1.6;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">
              <div>Приложение: <a href="${params.appUrl}" style="color:#1d4ed8;">${params.appUrl}</a></div>
              <div>Сервер: ${host}</div>
              <div>Время: ${now}</div>
              ${params.footerNote ? `<div style="margin-top:8px;">${params.footerNote}</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    params.title,
    '',
    params.bodyText,
    '',
    `Приложение: ${params.appUrl}`,
    `Сервер: ${host}`,
    `Время: ${now}`,
    params.footerNote ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}

export function buildSmtpTestEmail(appUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const { html, text } = layout({
    appUrl,
    title: 'Тест почтовой системы',
    bodyHtml:
      '<p style="margin:0 0 12px;">Почтовая система работает корректно.</p><p style="margin:0;color:#475569;">Это автоматическое тестовое письмо из раздела «Настройки → Почта и уведомления».</p>',
    bodyText: 'Почтовая система работает корректно.',
    footerNote: 'Если вы не запускали тест SMTP, проигнорируйте письмо.',
  });

  return {
    subject: 'MED-ЛОГИСТИКА — тест почтовой системы',
    html,
    text,
  };
}

export function buildPasswordResetEmail(
  appUrl: string,
  resetUrl: string,
): { subject: string; html: string; text: string } {
  const { html, text } = layout({
    appUrl,
    title: 'Восстановление пароля',
    bodyHtml: [
      '<p>Вы запросили восстановление пароля для системы <strong>MED-ЛОГИСТИКА</strong>.</p>',
      `<p style="margin:20px 0;"><a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">Установить новый пароль</a></p>`,
      '<p style="color:#64748b;font-size:13px;">Ссылка действует 15 минут. Если вы не запрашивали сброс, проигнорируйте письмо.</p>',
    ].join(''),
    bodyText: [
      'Вы запросили восстановление пароля для MED-ЛОГИСТИКА.',
      `Ссылка: ${resetUrl}`,
      'Ссылка действует 15 минут.',
    ].join('\n'),
  });

  return {
    subject: 'Восстановление пароля MED-ЛОГИСТИКА',
    html,
    text,
  };
}

export function buildOperationalAlertEmail(
  appUrl: string,
  title: string,
  message: string,
  href?: string,
): { subject: string; html: string; text: string } {
  const linkBlock = href
    ? `<p><a href="${appUrl}${href.startsWith('/') ? href : `/${href}`}" style="color:#1d4ed8;">Открыть в системе</a></p>`
    : '';

  const { html, text } = layout({
    appUrl,
    title,
    bodyHtml: `<p style="margin:0 0 12px;">${message}</p>${linkBlock}`,
    bodyText: message + (href ? `\nСсылка: ${appUrl}${href}` : ''),
  });

  return {
    subject: `MED-ЛОГИСТИКА — ${title}`,
    html,
    text,
  };
}
