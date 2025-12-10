"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Payload } from "@/types/estimate";

// === TAX LOGIC (same as your frontend) ===
const STATE_TAX_MAP: Record<string, number> = {
  NY: 0.08875,
  NJ: 0.06625,
  CT: 0.0635,
  PA: 0.06,
  FL: 0.06,
  CA: 0.0725,
};

function extractState(billTo?: string): string | undefined {
  if (!billTo) return undefined;
  const parts = billTo.split(/[ ,]+/);
  return parts.find(p => /^[A-Za-z]{2}$/.test(p))?.toUpperCase();
}

function getTaxRateForState(state: string | undefined): number {
  if (!state) return 0.08875;
  return STATE_TAX_MAP[state.trim().toUpperCase()] || 0.08875;
}

export async function generateInvoicePdf(data: Payload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // === COMPANY HEADER ===
  page.drawText("CREATIVE HOME DECOR", {
    x: margin,
    y,
    size: 24,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  page.drawText("Address: 1831 UTICA AVE, BROOKLYN, NY 11234", {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 16;
  page.drawText("Tel: 347-628-1812   Fax: 347-628-1812", {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  // === INVOICE # ===
  page.drawText(`INVOICE#: ${data.invoiceNo}`, {
    x: width - margin - 210,
    y: height - margin - 50,
    size: 16,
    font: bold,
    color: rgb(0, 0, 0),
  });

  // === BILL TO & SHIP TO ===
  y = height - margin - 120;
  const boxWidth = (width - 3 * margin) / 2;
  const boxWidthHeight = 90;

  // Bill To
  page.drawRectangle({
    x: margin,
    y: y - boxWidthHeight,
    width: boxWidth,
    height: boxWidthHeight,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText("Bill To:", { x: margin + 12, y: y - 20, size: 13, font: bold });
  drawLines(page, data.billTo || "", margin + 12, y - 45, font);

  // Ship To
  page.drawRectangle({
    x: margin + boxWidth + margin,
    y: y - boxWidthHeight,
    width: boxWidth,
    height: boxWidthHeight,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText("Ship To:", { x: margin + boxWidth + margin + 12, y: y - 20, size: 13, font: bold });
  drawLines(page, data.shipTo || data.billTo || "", margin + boxWidth + margin + 12, y - 45, font);

  // === TABLE ===
  y -= boxWidthHeight + 40;
  const tableTop = y;
  const colWidths = [85, 210, 60, 85, 100];
  let x = margin;

  // Header
  page.drawRectangle({
    x: margin,
    y: tableTop - 35,
    width: width - 2 * margin,
    height: 35,
    color: rgb(0.88, 0.88, 0.88),
  });

  const headers = ["Item", "Description", "Qty", "Price", "Amount"];
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + 12, y: tableTop - 22, size: 12, font: bold });
    x += colWidths[i];
  });

  y = tableTop - 65;

  for (const item of data.items) {
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const amount = qty * rate;

    x = margin;

    page.drawText(item.productId?.toString() || "", { x: x + 12, y, size: 11, font });
    x += colWidths[0];
    page.drawText(item.description || "", { x: x + 12, y, size: 11, font });
    x += colWidths[1];
    page.drawText(qty.toString(), { x: x + 25, y, size: 11, font });
    x += colWidths[2];
    page.drawText(`$${rate.toFixed(2)}`, { x: x + 12, y, size: 11, font });
    x += colWidths[3];
    page.drawText(`$${amount.toFixed(2)}`, { x: x + 12, y, size: 11, font });

    y -= 30;
  }

  page.drawLine({
    start: { x: margin, y: y + 15 },
    end: { x: width - margin, y: y + 15 },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });

  // === FOOTER ===
  y -= 60;
  page.drawText(`DATE: ${data.date}`, { x: margin, y, size: 12, font: bold });
  y -= 24;
  page.drawText(`SALESMAN: ${data.salesman || "LIVIA"}`, { x: margin, y, size: 12, font });
  y -= 24;
  page.drawText(`TIME: ${data.time}`, { x: margin, y, size: 12, font });

  page.drawText("THANK YOU FOR SHOPPING", {
    x: margin,
    y: y - 60,
    size: 18,
    font: bold,
    color: rgb(0.8, 0, 0),
  });

  // === TOTALS BOX — NOW USING CORRECT DYNAMIC TAX ===
  const totalBoxWidth = 220;
  const totalBoxHeight = 130;
  const totalBoxX = width - margin - totalBoxWidth;
  const totalBoxY = 60;

  page.drawRectangle({
    x: totalBoxX,
    y: totalBoxY,
    width: totalBoxWidth,
    height: totalBoxHeight,
    borderWidth: 2,
    borderColor: rgb(0, 0, 0),
  });

  let ty = totalBoxY + totalBoxHeight - 25;

  // Use values already calculated and passed in Payload
  const subtotalAfterDiscount = data.subtotal - (data.discount || 0);
  const taxAmount = data.tax || 0;
  const finalTotal = data.total || 0;

  // Detect state and show correct tax rate label
  const state = extractState(data.billTo);
  const taxRate = getTaxRateForState(state);
  const taxLabel = state
    ? `Tax ${state} (${(taxRate * 100).toFixed(3)}%)`
    : "Tax NY (8.875%)";

  page.drawText("Subtotal", { x: totalBoxX + 10, y: ty, size: 13, font });
  page.drawText(`$${subtotalAfterDiscount.toFixed(2)}`, { x: totalBoxX + 130, y: ty, size: 13, font });
  ty -= 28;

  if (data.discount && data.discount > 0) {
    page.drawText("Discount", { x: totalBoxX + 10, y: ty, size: 13, font });
    page.drawText(`-$${data.discount.toFixed(2)}`, { x: totalBoxX + 130, y: ty, size: 13, font });
    ty -= 28;
  }

  page.drawText(taxLabel, { x: totalBoxX + 10, y: ty, size: 13, font });
  page.drawText(`$${taxAmount.toFixed(2)}`, { x: totalBoxX + 130, y: ty, size: 13, font });
  ty -= 35;

  page.drawText("TOTAL", { x: totalBoxX + 10, y: ty, size: 18, font: bold });
  page.drawText(`$${finalTotal.toFixed(2)}`, { x: totalBoxX + 120, y: ty, size: 20, font: bold, color: rgb(0.8, 0, 0) });

  // === FINALIZE ===
  const pdfBytes = await doc.save();

  // Auto-download (optional — you can remove if you only want bytes)
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${data.invoiceNo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  return pdfBytes;
}

// Helper: Draw multi-line text
function drawLines(page: any, text: string, x: number, yStart: number, font: any) {
  const lines = (text || "").split("\n").filter(Boolean);
  let y = yStart;
  for (const line of lines) {
    page.drawText(line.trim(), { x, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 19;
  }
}