/** Web-only print helpers. No-ops on native. */

const STYLE_ID = 'relatorio-print-styles';

/** Injects a print stylesheet once so the report prints fully (no clipping). */
export function injectReportPrintStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '@media print {',
    '  body { background: #ffffff !important; }',
    '  html, body, #root { height: auto !important; overflow: visible !important; }',
    '  #relatorio-root, #relatorio-root * { overflow: visible !important; }',
    '  #relatorio-no-print { display: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
}

export function printReport(): void {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}
