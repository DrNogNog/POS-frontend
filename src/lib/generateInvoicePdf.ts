"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Payload } from "@/types/estimate";

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
  const boxHeight = 90;

  // Bill To
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText("Bill To:", { x: margin + 12, y: y - 20, size: 13, font: bold });
  drawLines(page, data.billTo || "", margin + 12, y - 45, font);

  // Ship To
  page.drawRectangle({
    x: margin + boxWidth + margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText("Ship To:", { x: margin + boxWidth + margin + 12, y: y - 20, size: 13, font: bold });
  drawLines(page, data.shipTo || data.billTo || "", margin + boxWidth + margin + 12, y - 45, font);

  // === TABLE ===
  y -= boxHeight + 40;
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
  let calculatedSubtotal = 0;

  for (const item of data.items) {
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const amount = qty * rate;
    calculatedSubtotal += amount;

    x = margin;

    // Fixed: productId is number → convert to string
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

  // === TOTALS BOX ===
  const totalBoxWidth = 200;
  const totalBoxHeight = 100;
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

  const nySalesTaxRate = 0.08875;
  const subtotalAfterDiscount = calculatedSubtotal - (data.discount || 0);
  const tax = Number((subtotalAfterDiscount * nySalesTaxRate).toFixed(2));
  const total = subtotalAfterDiscount + tax;

  page.drawText("Subtotal", { x: totalBoxX + 10, y: ty, size: 13, font });
  page.drawText(`$${subtotalAfterDiscount.toFixed(2)}`, { x: totalBoxX + 120, y: ty, size: 13, font });
  ty -= 28;

  if (data.discount && data.discount > 0) {
    page.drawText("Discount", { x: totalBoxX + 10, y: ty, size: 13, font });
    page.drawText(`-$${data.discount.toFixed(2)}`, { x: totalBoxX + 120, y: ty, size: 13, font });
    ty -= 28;
  }

  page.drawText("Tax (8.875%)", { x: totalBoxX + 10, y: ty, size: 13, font });
  page.drawText(`$${tax.toFixed(2)}`, { x: totalBoxX + 120, y: ty, size: 13, font });
  ty -= 35;

  page.drawText("TOTAL", { x: totalBoxX + 10, y: ty, size: 18, font: bold });
  page.drawText(`$${total.toFixed(2)}`, { x: totalBoxX + 110, y: ty, size: 20, font: bold });

  // === FINALIZE & DOWNLOAD ===
  const pdfBytes = await doc.save();

  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${data.invoiceNo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  return pdfBytes;
}

// Helper function
function drawLines(page: any, text: string, x: number, yStart: number, font: any) {
  const lines = (text || "").split("\n").filter(Boolean);
  let y = yStart;
  for (const line of lines) {
    page.drawText(line.trim(), { x, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 19;
  }
}