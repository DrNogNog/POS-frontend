"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BillingPayload } from "@/types/estimate";

function formatCurrency(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export async function generateBillingPdf(
  data: BillingPayload,
  returnBlob = false
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // COMPANY HEADER
  page.drawText(data.companyName || "", { x: margin, y, size: 16, font: bold });
  y -= 20;
  page.drawText(data.companyAddr1 || "", { x: margin, y, size: 11, font });
  y -= 18;
  page.drawText(`Phone #: ${data.phone || ""}`, { x: margin, y, size: 11, font });

  // EMAIL & WEBSITE (Center)
  const centerX = width / 2 - 40;
  y = height - margin - 5;
  page.drawText("E-mail", { x: centerX - 80, y, size: 11, font });
  page.drawText(data.email || "", { x: centerX - 30, y, size: 11, font, color: rgb(0, 0.3, 0.8) });
  page.drawText("Web Site", { x: centerX - 80, y: y - 20, size: 11, font });
  page.drawText(data.website || "", { x: centerX - 30, y: y - 20, size: 11, font, color: rgb(0, 0.3, 0.8) });

  // BILLING TITLE + BOX
  page.drawText("Billing", { x: width - margin - 120, y: height - margin, size: 20, font: bold });
  const boxX = width - margin - 180;
  const boxY = height - margin - 70;
  page.drawRectangle({ x: boxX, y: boxY, width: 160, height: 50, borderColor: rgb(0, 0, 0), borderWidth: 1 });

  page.drawText("Date", { x: boxX + 10, y: boxY + 30, size: 11, font });
  page.drawText(data.date || new Date().toISOString().slice(0, 10), { x: boxX + 90, y: boxY + 30, size: 11, font });

  page.drawText("Billing #", { x: boxX + 10, y: boxY + 8, size: 11, font });
  page.drawText(data.invoiceNo || "1", { x: boxX + 90, y: boxY + 8, size: 11, font });

  // BILL TO & SHIP TO BOXES
  y = height - margin - 120;
  const boxWidth = (width - 3 * margin) / 2;
  const boxHeight = 90;

  // Bill To
  page.drawRectangle({ x: margin, y: y - boxHeight, width: boxWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText("Name / Address", { x: margin + 10, y: y - 18, size: 11, font: bold });
  let by = y - 38;
  for (const line of (data.billTo || "").split("\n")) {
    if (line.trim()) {
      page.drawText(line.trim(), { x: margin + 10, y: by, size: 11, font });
      by -= 18;
    }
  }

  // Ship To
  page.drawRectangle({ x: margin + boxWidth + margin, y: y - boxHeight, width: boxWidth, height: boxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText("Ship To", { x: margin + boxWidth + margin + 10, y: y - 18, size: 11, font: bold });
  let sy = y - 38;
  for (const line of (data.shipTo || data.billTo || "").split("\n")) {
    if (line.trim()) {
      page.drawText(line.trim(), { x: margin + boxWidth + margin + 10, y: sy, size: 11, font });
      sy -= 18;
    }
  }

  // TABLE
  y = y - boxHeight - 30;
  const tableTop = y;

  // Header
  page.drawRectangle({ x: margin, y: tableTop - 25, width: width - 2 * margin, height: 25, color: rgb(0.9, 0.9, 0.9) });
  const headers = ["Item", "Qty", "Description", "Rate", "Total"];
  const colWidths = [80, 60, 220, 80, 100];
  let x = margin;
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + 8, y: tableTop - 15, size: 11, font: bold });
    x += colWidths[i];
  });
  page.drawLine({ start: { x: margin, y: tableTop - 25 }, end: { x: width - margin, y: tableTop - 25 }, thickness: 1 });

  y = tableTop - 50;
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    if (!item.item && qty === 0 && rate === 0) continue;
    const amount = qty * rate;

    x = margin;
    page.drawText(item.item || "", { x: x + 5, y, size: 10, font });
    x += colWidths[0];
    page.drawText(qty > 0 ? qty.toString() : "", { x: x + 5, y, size: 10, font });
    x += colWidths[1];
    page.drawText(item.description || "", { x: x + 5, y, size: 10, font });
    x += colWidths[2];
    page.drawText(rate > 0 ? formatCurrency(rate) : "", { x: x + 5, y, size: 10, font });
    x += colWidths[3];
    page.drawText(amount > 0 ? formatCurrency(amount) : "", { x: x + 5, y, size: 10, font });
    y -= 20;
  }

  // TOTALS
  const totalBoxWidth = 200;
  const totalBoxHeight = 80;
  const totalBoxX = width - margin - totalBoxWidth;
  const totalBoxY = 10;

  page.drawRectangle({ x: totalBoxX, y: totalBoxY, width: totalBoxWidth, height: totalBoxHeight, borderColor: rgb(0, 0, 0), borderWidth: 1.5 });
  let ty = totalBoxY + totalBoxHeight - 30;
  page.drawText("Subtotal", { x: totalBoxX + 15, y: ty, size: 12, font });
  page.drawText(formatCurrency(data.subtotal), { x: totalBoxX + totalBoxWidth - 100, y: ty, size: 12, font });
  ty -= 28;
  page.drawText("Total", { x: totalBoxX + 15, y: ty, size: 14, font: bold });
  page.drawText(formatCurrency(data.total), { x: totalBoxX + totalBoxWidth - 110, y: ty, size: 14, font: bold });

  // Generate PDF bytes
  const pdfBytes = await doc.save();

  // Always return a Blob
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });

  // If not returning blob, trigger download
  if (!returnBlob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Billing-${data.invoiceNo || "draft"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return blob; // Always returns Blob
}
