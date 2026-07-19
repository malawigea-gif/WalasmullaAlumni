import path from "path";
import PDFDocument from "pdfkit";
import type { AccountEntryCategory, AccountEntryType, PaymentMethod } from "@prisma/client";

const SINHALA_FONT_PATH = path.join(__dirname, "../../assets/fonts/NotoSansSinhala.ttf");

type ReportEntry = {
  type: AccountEntryType;
  category: AccountEntryCategory | null;
  paymentMethod: PaymentMethod;
  description: string;
  amount: unknown; // Prisma Decimal
  entryDate: Date;
};

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

const COLUMNS = [
  { key: "date", header: "දිනය", width: 70 },
  { key: "membership", header: "සාමාජික ගාස්තු", width: 75 },
  { key: "aid", header: "ආධාර", width: 70 },
  { key: "fine", header: "දඩ මුදල්", width: 70 },
  { key: "bankInterest", header: "bank interest", width: 75 },
  { key: "other", header: "වෙනත්", width: 60 },
  { key: "expenseDesc", header: "වියදම", width: 110 },
  { key: "expenseAmount", header: "මුදල", width: 70 },
  { key: "cashBalance", header: "අත ඉතිරි", width: 70 },
  { key: "bankBalance", header: "බැංකු ගිණුම", width: 70 },
] as const;

const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const ROW_HEIGHT = 22;

export function buildBudgetReportPdf(data: {
  /** All approved entries from the balance baseline (e.g. last account reset) through `to`, used to compute correct running balances even for rows before `from`. */
  entries: ReportEntry[];
  openingCashBalance: number;
  openingBankBalance: number;
  /** Only rows on/after this date are drawn, though earlier entries still count toward the running balance. */
  from?: string;
  to?: string;
}): PDFKit.PDFDocument {
  const { entries, openingCashBalance, openingBankBalance, from, to } = data;
  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
  doc.registerFont("Sinhala", SINHALA_FONT_PATH);
  doc.font("Sinhala");

  const left = doc.page.margins.left;
  let y = doc.page.margins.top;

  doc.fontSize(16).text("අයවැය", left, y, { width: TABLE_WIDTH, align: "center" });
  y += 26;
  if (from || to) {
    doc
      .fontSize(9)
      .fillColor("#555")
      .text(`${from ?? "-"} — ${to ?? "-"}`, left, y, { width: TABLE_WIDTH, align: "center" });
    doc.fillColor("#000");
    y += 16;
  }

  function drawCellBorder(x: number, rowY: number, width: number, height: number) {
    doc.rect(x, rowY, width, height).stroke();
  }

  function drawMergedHeaderRow(rowY: number) {
    const incomeWidth = COLUMNS.slice(1, 6).reduce((s, c) => s + c.width, 0);
    const expenseWidth = COLUMNS.slice(6, 8).reduce((s, c) => s + c.width, 0);
    let x = left;
    drawCellBorder(x, rowY, COLUMNS[0].width, ROW_HEIGHT);
    x += COLUMNS[0].width;
    drawCellBorder(x, rowY, incomeWidth, ROW_HEIGHT);
    doc.fontSize(10).text("ආදායම්", x, rowY + 6, { width: incomeWidth, align: "center" });
    x += incomeWidth;
    drawCellBorder(x, rowY, expenseWidth, ROW_HEIGHT);
    doc.fontSize(10).text("වියදම", x, rowY + 6, { width: expenseWidth, align: "center" });
    x += expenseWidth;
    const balanceWidth = COLUMNS.slice(8).reduce((s, c) => s + c.width, 0);
    drawCellBorder(x, rowY, balanceWidth, ROW_HEIGHT);
  }

  function drawColumnHeaderRow(rowY: number) {
    let x = left;
    for (const col of COLUMNS) {
      drawCellBorder(x, rowY, col.width, ROW_HEIGHT);
      doc.fontSize(8).text(col.header, x + 2, rowY + 6, { width: col.width - 4, align: "center" });
      x += col.width;
    }
  }

  function drawDataRow(rowY: number, cells: Record<string, string>) {
    let x = left;
    for (const col of COLUMNS) {
      drawCellBorder(x, rowY, col.width, ROW_HEIGHT);
      doc.fontSize(8).text(cells[col.key] ?? "", x + 2, rowY + 6, { width: col.width - 4, align: "center" });
      x += col.width;
    }
  }

  drawMergedHeaderRow(y);
  y += ROW_HEIGHT;
  drawColumnHeaderRow(y);
  y += ROW_HEIGHT;

  const income = entries.filter((e) => e.type === "income");
  const expense = entries.filter((e) => e.type === "expense");
  const allDates = Array.from(new Set(entries.map((e) => dateKey(e.entryDate)))).sort();

  const sumBy = (dayEntries: ReportEntry[], category: AccountEntryCategory) =>
    dayEntries.filter((e) => e.category === category).reduce((s, e) => s + Number(e.amount), 0);

  let runningCash = openingCashBalance;
  let runningBank = openingBankBalance;

  const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom;
  let rowsDrawn = 0;

  for (const d of allDates) {
    const shouldDraw = !from || d >= from;

    if (shouldDraw && y + ROW_HEIGHT > PAGE_BOTTOM) {
      doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
      doc.font("Sinhala");
      y = doc.page.margins.top;
      drawColumnHeaderRow(y);
      y += ROW_HEIGHT;
    }

    const dayIncome = income.filter((e) => dateKey(e.entryDate) === d);
    const dayExpense = expense.filter((e) => dateKey(e.entryDate) === d);

    for (const e of dayIncome) {
      const amt = Number(e.amount);
      if (e.paymentMethod === "bank") runningBank += amt;
      else runningCash += amt;
    }
    let expenseTotal = 0;
    for (const e of dayExpense) {
      const amt = Number(e.amount);
      expenseTotal += amt;
      if (e.paymentMethod === "bank") runningBank -= amt;
      else runningCash -= amt;
    }

    if (shouldDraw) {
      drawDataRow(y, {
        date: new Date(d).toLocaleDateString(),
        membership: sumBy(dayIncome, "membership_fee").toFixed(2),
        aid: sumBy(dayIncome, "aid").toFixed(2),
        fine: sumBy(dayIncome, "fine").toFixed(2),
        bankInterest: sumBy(dayIncome, "bank_interest").toFixed(2),
        other: sumBy(dayIncome, "other").toFixed(2),
        expenseDesc: dayExpense.map((e) => e.description).join("; "),
        expenseAmount: expenseTotal.toFixed(2),
        cashBalance: runningCash.toFixed(2),
        bankBalance: runningBank.toFixed(2),
      });
      y += ROW_HEIGHT;
      rowsDrawn++;
    }
  }

  if (rowsDrawn === 0) {
    doc.fontSize(10).text("තෝරාගත් කාල පරිච්ඡේදය තුළ සටහන් නොමැත.", left, y + 8, { width: TABLE_WIDTH, align: "center" });
  }

  return doc;
}
