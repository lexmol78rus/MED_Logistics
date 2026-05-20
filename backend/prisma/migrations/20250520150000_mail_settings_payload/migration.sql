-- Default mail settings block in system_settings JSON payload (UI-managed SMTP).
UPDATE "system_settings"
SET "payload" = COALESCE("payload"::jsonb, '{}'::jsonb) || jsonb_build_object(
  'mail', jsonb_build_object(
    'smtp', jsonb_build_object(
      'host', 'smtp.yandex.ru',
      'port', 465,
      'user', '',
      'from', '',
      'secure', true
    ),
    'notifications', jsonb_build_object(
      'passwordReset', true,
      'lowStock', false,
      'expiryCritical', false,
      'lotBlocked', false,
      'lotRecall', false,
      'authFailed', false,
      'system', false
    )
  )
)
WHERE "id" = 'default'
  AND NOT (COALESCE("payload"::jsonb, '{}'::jsonb) ? 'mail');
