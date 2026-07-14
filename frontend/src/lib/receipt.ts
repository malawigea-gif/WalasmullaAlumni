export interface ReceiptLine {
  label: string;
  value: string;
}

export interface ReceiptOptions {
  associationName: string;
  title: string;
  receiptNoLabel: string;
  receiptNo: string;
  dateLabel: string;
  date: string;
  lines: ReceiptLine[];
  amountLabel: string;
  amount: string;
  issuedByLabel: string;
  issuedBy: string;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Opens a print dialog with an 80mm-thermal-printer-sized receipt. */
export function printReceipt(opts: ReceiptOptions) {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;

  const rowsHtml = opts.lines
    .map((l) => `<div class="row"><span>${escapeHtml(l.label)}</span><span>${escapeHtml(l.value)}</span></div>`)
    .join("");

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0 auto; color: #000; }
  .center { text-align: center; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .amount { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
  h1 { font-size: 13px; margin: 0 0 2px; }
  h2 { font-size: 12px; margin: 4px 0; font-weight: normal; }
</style>
</head>
<body>
  <div class="center">
    <h1>${escapeHtml(opts.associationName)}</h1>
    <h2>${escapeHtml(opts.title)}</h2>
  </div>
  <div class="divider"></div>
  <div class="row"><span>${escapeHtml(opts.receiptNoLabel)}</span><span>${escapeHtml(opts.receiptNo)}</span></div>
  <div class="row"><span>${escapeHtml(opts.dateLabel)}</span><span>${escapeHtml(opts.date)}</span></div>
  <div class="divider"></div>
  ${rowsHtml}
  <div class="divider"></div>
  <div class="amount">${escapeHtml(opts.amountLabel)}: ${escapeHtml(opts.amount)}</div>
  <div class="divider"></div>
  <div class="row"><span>${escapeHtml(opts.issuedByLabel)}</span><span>${escapeHtml(opts.issuedBy)}</span></div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}
