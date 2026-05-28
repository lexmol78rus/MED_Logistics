/**
 * Печать через скрытый iframe: пустой title и без URL страницы в колонтитулах
 * (в Chrome/Firefox при включённых «Колонтитулах» остаётся только about:blank).
 */
export function printElementInIframe(contentRoot: HTMLElement): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none';

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    window.print();
    return;
  }

  const stylesheetHrefs = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => link.href)
    .filter(Boolean);

  doc.open();
  doc.write('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title> </title></head><body></body></html>');
  doc.close();

  doc.title = ' ';

  for (const href of stylesheetHrefs) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  }

  const pageStyle = doc.createElement('style');
  pageStyle.textContent = `
    @page { size: A4 landscape; margin: 8mm 10mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .shipment-print-doc { width: 100%; box-sizing: border-box; }
  `;
  doc.head.appendChild(pageStyle);

  const clone = contentRoot.cloneNode(true) as HTMLElement;
  doc.body.appendChild(clone);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    win.removeEventListener('afterprint', cleanup);
    iframe.remove();
  };

  win.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 120_000);

  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      window.print();
    }
  };

  const waitForStyles = () => {
    requestAnimationFrame(() => requestAnimationFrame(doPrint));
  };

  if (doc.readyState === 'complete') {
    waitForStyles();
  } else {
    win.addEventListener('load', waitForStyles, { once: true });
  }
}
