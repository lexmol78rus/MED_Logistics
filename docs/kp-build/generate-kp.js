const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  LevelFormat,
  convertInchesToTwip,
} = require('docx');

const COLOR = {
  primary: '1E3A5F',
  accent: '2563EB',
  light: 'EFF6FF',
  muted: '64748B',
  border: 'CBD5E1',
  white: 'FFFFFF',
  success: '059669',
  warning: 'D97706',
};

const FONT = 'Calibri';

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT,
        bold: true,
        color: level === HeadingLevel.HEADING_1 ? COLOR.primary : COLOR.accent,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 24,
      }),
    ],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 276 },
    alignment: opts.align,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? 22,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ?? '1E293B',
      }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 60, line: 276 },
    children: [new TextRun({ text, font: FONT, size: 22, color: '334155' })],
  });
}

function cell(text, opts = {}) {
  const children = Array.isArray(text)
    ? text
    : [
        new Paragraph({
          alignment: opts.align ?? AlignmentType.LEFT,
          children: [
            new TextRun({
              text: String(text),
              font: FONT,
              size: opts.size ?? 20,
              bold: opts.bold,
              color: opts.color ?? (opts.header ? COLOR.white : '1E293B'),
            }),
          ],
        }),
      ];
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children,
  });
}

function table(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, { bold: true, header: true, shading: COLOR.primary, width: colWidths?.[i] }),
    ),
  });
  const dataRows = rows.map(
    (row, ri) =>
      new TableRow({
        children: row.map((c, ci) =>
          cell(c, { shading: ri % 2 === 0 ? COLOR.light : COLOR.white, width: colWidths?.[ci] }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
    },
    rows: [headerRow, ...dataRows],
  });
}

function spacer(pts = 120) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}

function sectionTitle(num, title) {
  return heading(`${num}. ${title}`, HeadingLevel.HEADING_1);
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 32, bold: true, font: FONT, color: COLOR.primary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 26, bold: true, font: FONT, color: COLOR.accent },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: '◦',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.9),
            right: convertInchesToTwip(0.85),
            bottom: convertInchesToTwip(0.9),
            left: convertInchesToTwip(0.85),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'МЕД-ЛОГИСТИКА · Коммерческое предложение',
                  font: FONT,
                  size: 18,
                  color: COLOR.muted,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Стр. ', font: FONT, size: 18, color: COLOR.muted }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR.muted }),
                new TextRun({ text: ' из ', font: FONT, size: 18, color: COLOR.muted }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: COLOR.muted }),
              ],
            }),
          ],
        }),
      },
      children: [
        // === TITLE BLOCK ===
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',
              font: FONT,
              size: 20,
              color: COLOR.accent,
              bold: true,
              characterSpacing: 40,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: 'Система складского учёта',
              font: FONT,
              size: 44,
              bold: true,
              color: COLOR.primary,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: '«МЕД-ЛОГИСТИКА»',
              font: FONT,
              size: 36,
              bold: true,
              color: COLOR.accent,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: 'Medical Warehouse Management System',
              font: FONT,
              size: 22,
              color: COLOR.muted,
              italics: true,
            }),
          ],
        }),

        table(
          ['Параметр', 'Значение'],
          [
            ['Дата', '29 мая 2026 г.'],
            ['Срок действия КП', '30 календарных дней'],
            ['Статус продукта', 'Готовое решение · пилот пройден · внедрение'],
            ['Формат', 'Веб-система · один склад · до 20 пользователей'],
          ],
          [35, 65],
        ),

        spacer(200),

        para(
          'Настоящее предложение описывает поставку и внедрение готовой системы складского учёта медицинских товаров. Интеграции с 1С и «Честный ЗНАК» оформляются отдельным договором и оплачиваются дополнительно (раздел 4.2).',
          { after: 160 },
        ),

        // === 1. О ПРОДУКТЕ ===
        sectionTitle(1, 'О продукте'),
        para(
          '«МЕД-ЛОГИСТИКА» — специализированная WMS для медицинского склада: партийный учёт, контроль сроков годности, регистрационные удостоверения (РУ), приёмка и списание по FEFO, отгрузки, прослеживаемость операций и ролевой доступ персонала.',
        ),
        para(
          'Продукт уже разработан и прошёл пилотную эксплуатацию. Сумма 600 000 ₽ относится только к лицензии и внедрению текущей версии — всего, что реализовано и работает на сегодня. Подключение 1С и маркировки — следующий этап по отдельной смете.',
        ),

        heading('Технологический стек', HeadingLevel.HEADING_2),
        bullet(
          'Клиентское приложение (Frontend): React 19 + Vite + TypeScript; интерфейс на Tailwind CSS; таблицы AG Grid; состояние Zustand; кеш и запросы к API — TanStack React Query',
        ),
        bullet(
          'Сервер приложений (Backend): NestJS (Node.js 20), REST API с префиксом /api/v1; валидация входных данных (class-validator); единый формат ошибок',
        ),
        bullet(
          'База данных: PostgreSQL 16; доступ через Prisma ORM; версионирование схемы миграциями (prisma migrate)',
        ),
        bullet(
          'Авторизация и безопасность: JWT (access + refresh), Passport; хеширование паролей bcrypt; RBAC — 4 роли (Администратор, Менеджер, Оператор, Наблюдатель); rate limiting; шифрование чувствительных настроек',
        ),
        bullet(
          'Инфраструктура: Docker Compose (dev/prod); multi-stage сборка образов; nginx как reverse proxy и раздача статики фронтенда; health-check endpoints (live/ready)',
        ),
        bullet(
          'Эксплуатация и надёжность: структурированное логирование (Pino); автоматический запуск миграций при старте контейнера; скрипты резервного копирования БД; журнал аудита всех значимых действий',
        ),
        bullet(
          'Почта и уведомления: настраиваемый SMTP (Nodemailer); восстановление пароля; in-app уведомления; тестовая отправка из панели администратора',
        ),
        bullet(
          'Архитектура интеграций: модульный API готов к подключению внешних систем; планируемые коннекторы — 1С:Предприятие (обмен справочниками и документами) и ГИС МТ «Честный ЗНАК» (маркировка, КМ) — реализуются отдельным этапом',
        ),

        // === 2. ФУНКЦИОНАЛ ===
        new Paragraph({ children: [new PageBreak()] }),
        sectionTitle(2, 'Реализованный функционал (на текущий момент)'),

        heading('2.1. Безопасность и пользователи', HeadingLevel.HEADING_2),
        bullet('Вход в систему, автоматическое обновление сессии'),
        bullet('Восстановление пароля по e-mail'),
        bullet('Роли: Администратор, Менеджер, Оператор, Наблюдатель'),
        bullet('Управление пользователями: создание, редактирование, сброс пароля'),

        heading('2.2. Номенклатура и документы', HeadingLevel.HEADING_2),
        bullet('Справочник товаров, фильтры, быстрое создание при приёмке'),
        bullet('Регистрационные удостоверения (РУ): загрузка и хранение файлов'),
        bullet('Партии (лоты): статусы, ячейки, локации на складе'),
        bullet('Ожидаемые поставки: планирование, закрытие, отмена'),

        heading('2.3. Складские операции', HeadingLevel.HEADING_2),
        bullet('Приёмка товара с корзиной позиций и привязкой к партиям'),
        bullet('Списание: одиночное и пакетное, рекомендации FEFO'),
        bullet('Справочник направлений списания (утилизация, брак и др.)'),
        bullet('Корректировка ошибочных списаний (администратор / менеджер)'),
        bullet('Журнал движений — полная история складских операций'),
        bullet('Остатки и баланс по товарам и партиям'),

        heading('2.4. Контроль качества', HeadingLevel.HEADING_2),
        bullet('Контроль сроков годности: сводка, критические партии'),
        bullet('Отзыв партий по номеру лота'),
        bullet('Журнал аудита действий пользователей'),

        heading('2.5. Отгрузки и контрагенты', HeadingLevel.HEADING_2),
        bullet('Отгрузки: создание, комплектация (picking), пауза, завершение'),
        bullet('Печатные формы по отгрузке'),
        bullet('Связь отгрузки со списанием'),
        bullet('Справочники заказчиков и поставщиков, договоры, файлы'),

        heading('2.6. Работа на складе (ТСД / сканер)', HeadingLevel.HEADING_2),
        bullet('ТСД-терминал — упрощённый интерфейс для сканера'),
        bullet('Глобальная обработка штрихкодов'),
        bullet('Справочник штрихкодов'),

        heading('2.7. Аналитика и администрирование', HeadingLevel.HEADING_2),
        bullet('Панель управления: сводка, критические сроки, отгрузки'),
        bullet('Отчёт по смене, экспорт в Excel (товары, партии, движения, сроки)'),
        bullet('Уведомления в интерфейсе'),
        bullet('Настройки системы и почты (SMTP)'),

        // === 3. ИНТЕГРАЦИИ ===
        spacer(120),
        sectionTitle(3, 'Интеграции (отдельный этап, не входят в 600 000 ₽)'),
        para(
          'Подключение учётной системы 1С и маркировки «Честный ЗНАК» планируется в рамках того же проекта, но оплачивается отдельно — после стабилизации базового внедрения и приёмки склада. Состав и объём обмена фиксируются в дополнительном ТЗ.',
          { after: 160 },
        ),

        table(
          ['Интеграция', 'Назначение', 'Ориентир срока'],
          [
            [
              '1С:Предприятие',
              'Синхронизация номенклатуры, остатков, документов приёмки/списания/отгрузки',
              '6–10 недель после приёмки базы',
            ],
            [
              '«Честный ЗНАК» (ГИС МТ)',
              'Приёмка и отгрузка маркированной продукции, сканирование КМ, вывод из оборота',
              '8–14 недель после приёмки базы',
            ],
          ],
          [22, 48, 30],
        ),

        spacer(120),
        para(
          'Важно: интеграции не входят в стоимость 600 000 ₽. Окончательная цена каждой интеграции определяется после согласования ТЗ (конфигурация 1С, перечень документов, типы маркированных товаров). Ориентиры — в разделе 4.2.',
          { italics: true, color: COLOR.warning, after: 160 },
        ),

        // === 4. СТОИМОСТЬ ===
        new Paragraph({ children: [new PageBreak()] }),
        sectionTitle(4, 'Стоимость и условия'),

        heading('4.1. Поставка готового продукта (текущая версия)', HeadingLevel.HEADING_2),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.accent },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.accent },
            left: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
            right: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLOR.border },
          },
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: '600 000 ₽',
                          font: FONT,
                          size: 40,
                          bold: true,
                          color: COLOR.accent,
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: 'единоразово, без НДС*',
                          font: FONT,
                          size: 20,
                          color: COLOR.muted,
                        }),
                      ],
                    }),
                  ],
                  { shading: COLOR.light, width: 35 },
                ),
                cell(
                  [
                    new Paragraph({
                      spacing: { after: 60 },
                      children: [
                        new TextRun({
                          text: 'В стоимость 600 000 ₽ входит:',
                          font: FONT,
                          size: 22,
                          bold: true,
                          color: COLOR.primary,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Бессрочная лицензия на готовую версию ПО (раздел 2)',
                          font: FONT,
                          size: 20,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Установка и настройка на сервере заказчика',
                          font: FONT,
                          size: 20,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Миграция БД, учётные записи, базовые справочники',
                          font: FONT,
                          size: 20,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Обучение до 6 пользователей (2 сессии)',
                          font: FONT,
                          size: 20,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: '3 месяца базовой поддержки после запуска',
                          font: FONT,
                          size: 20,
                        }),
                      ],
                    }),
                    new Paragraph({
                      spacing: { before: 120 },
                      children: [
                        new TextRun({
                          text: 'Не входит в 600 000 ₽:',
                          font: FONT,
                          size: 20,
                          bold: true,
                          color: COLOR.warning,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Интеграция с 1С (см. п. 4.2)',
                          font: FONT,
                          size: 20,
                          color: COLOR.muted,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Интеграция «Честный ЗНАК» (см. п. 4.2)',
                          font: FONT,
                          size: 20,
                          color: COLOR.muted,
                        }),
                      ],
                    }),
                    new Paragraph({
                      numbering: { reference: 'bullets', level: 0 },
                      children: [
                        new TextRun({
                          text: 'Доработки и новые модули сверх текущего функционала',
                          font: FONT,
                          size: 20,
                          color: COLOR.muted,
                        }),
                      ],
                    }),
                  ],
                  { width: 65 },
                ),
              ],
            }),
          ],
        }),

        spacer(80),
        para('* НДС начисляется в соответствии с применяемой системой налогообложения исполнителя.', {
          size: 18,
          color: COLOR.muted,
          italics: true,
        }),

        heading('4.2. Интеграции (отдельная оплата)', HeadingLevel.HEADING_2),
        para(
          'Стоимость уточняется по итогам ТЗ. Ниже — ориентиры для планирования бюджета. Оплата интеграций: 40% аванс, 40% после тестового обмена, 20% после приёмки.',
          { after: 120 },
        ),
        table(
          ['Работы', 'Ориентир стоимости', 'Срок'],
          [
            [
              'Интеграция 1С:Предприятие (номенклатура, остатки, документы)',
              'от 380 000 ₽',
              '6–10 недель',
            ],
            [
              'Интеграция «Честный ЗНАК» / ГИС МТ (маркировка, КМ)',
              'от 480 000 ₽',
              '8–14 недель',
            ],
            [
              'Комплекс: 1С + «Честный ЗНАК» (пакет)',
              'от 780 000 ₽',
              '10–16 недель',
            ],
          ],
          [38, 27, 35],
        ),

        spacer(120),
        heading('4.3. Сопровождение после внедрения', HeadingLevel.HEADING_2),
        table(
          ['Услуга', 'Стоимость', 'Условия'],
          [
            [
              'Техническое сопровождение',
              '60 000 ₽ / мес.',
              'До 8 ч/мес: ошибки, консультации, мелкие правки, бэкапы, обновления',
            ],
            ['Сверх лимита', '4 500 ₽ / час', 'По согласованию или отдельной смете'],
          ],
          [30, 25, 45],
        ),

        spacer(120),
        heading('4.4. График оплаты (базовое внедрение 600 000 ₽)', HeadingLevel.HEADING_2),
        table(
          ['Этап', 'Доля', 'Условие'],
          [
            ['Аванс', '50%', 'При подписании договора'],
            ['Промежуточный платёж', '30%', 'После установки на production-сервер'],
            ['Окончательный расчёт', '20%', 'После приёмки и 2 недель опытной эксплуатации'],
          ],
          [30, 15, 55],
        ),

        // === 5. СРОКИ ===
        spacer(200),
        sectionTitle(5, 'Сроки реализации'),
        para(
          'Сроки рассчитаны на внедрение силами одного специалиста с учётом согласований, тестирования и обучения персонала заказчика.',
          { after: 160 },
        ),

        table(
          ['Этап', 'Срок', 'Результат'],
          [
            ['Подписание договора, доступы', '1–2 недели', 'Старт проекта, ТЗ на внедрение'],
            ['Установка и настройка prod', '3–4 недели', 'Рабочий стенд на сервере заказчика'],
            ['Загрузка данных, обучение', '2–3 недели', 'Персонал работает в системе'],
            ['Опытная эксплуатация, приёмка', '2–3 недели', 'Акт приёмки базового внедрения'],
            ['Интеграция 1С', '6–10 недель*', 'Обмен с учётной системой'],
            ['Интеграция «Честный ЗНАК»', '8–14 недель*', 'Работа с маркированной продукцией'],
          ],
          [28, 22, 50],
        ),

        spacer(80),
        para('* Сроки интеграций отсчитываются от даты приёмки базового внедрения. Этапы могут частично выполняться параллельно по согласованию сторон.', {
          size: 18,
          color: COLOR.muted,
          italics: true,
        }),

        spacer(120),
        new Paragraph({
          shading: { fill: COLOR.light, type: ShadingType.CLEAR },
          spacing: { before: 120, after: 120 },
          indent: { left: 200, right: 200 },
          children: [
            new TextRun({
              text: 'Итого до промышленного старта базовой системы: ',
              font: FONT,
              size: 24,
              color: COLOR.primary,
            }),
            new TextRun({
              text: '10–12 недель (2,5–3 месяца)',
              font: FONT,
              size: 24,
              bold: true,
              color: COLOR.accent,
            }),
          ],
        }),

        // === 6. ПРЕИМУЩЕСТВА ===
        new Paragraph({ children: [new PageBreak()] }),
        sectionTitle(6, 'Преимущества для заказчика'),
        bullet('Готовый продукт — не макет, а работающая система с реальными операциями'),
        bullet('Медицинская специфика из коробки: партии, РУ, FEFO, отзыв, сроки годности'),
        bullet('Масштабируемость: сначала склад «из коробки», затем 1С и маркировка по отдельному бюджету'),
        bullet('Прозрачность: аудит, история движений, отчёт по смене'),
        bullet('Предсказуемый бюджет: фиксированная цена + понятное ежемесячное сопровождение'),

        spacer(200),
        sectionTitle(7, 'Контакты и реквизиты исполнителя'),

        table(
          ['', ''],
          [
            ['Исполнитель', '___________________________________________'],
            ['Контактное лицо', '___________________________________________'],
            ['Телефон', '___________________________________________'],
            ['E-mail', '___________________________________________'],
            ['ИНН / ОГРН', '___________________________________________'],
            ['Расчётный счёт', '___________________________________________'],
            ['Банк', '___________________________________________'],
          ],
          [30, 70],
        ),

        spacer(240),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: 'Готов провести демонстрацию системы на ваших данных.',
              font: FONT,
              size: 24,
              bold: true,
              color: COLOR.accent,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Длительность: 1–2 часа · Формат: онлайн или на площадке заказчика',
              font: FONT,
              size: 20,
              color: COLOR.muted,
            }),
          ],
        }),

        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '___________________________',
              font: FONT,
              size: 22,
              color: COLOR.muted,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Подпись исполнителя',
              font: FONT,
              size: 20,
              color: COLOR.muted,
            }),
          ],
        }),
      ],
    },
  ],
});

const outPath = path.join(__dirname, '..', 'KP_MED_Logistics.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log('Created:', outPath, '(' + buffer.length + ' bytes)');
});
