// lib/generateInvoicePdf.ts
"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type InvoiceItem = {
  sku: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
};

type InvoiceData = {
  invoiceNo: string;
  date: string;
  time: string;
  salesman: string;
  billTo: string;
  shipTo: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
};

export async function generateInvoicePdf(data: InvoiceData) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // === COMPANY HEADER ===
  page.drawText("BROOKLYN ONE BUILDING SUPPLY INC", {
    x: margin,
    y,
    size: 24,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  page.drawText("Address: 1458 65TH STREET BROOKLYN NY 11219", {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 16;
  page.drawText("Tel: 718-837-8222/8111   Fax: 718-837-8833", {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  // === INVOICE # — MOVED UP & TO THE RIGHT (NO OVERLAP) ===
  page.drawText(`INVOICE#: ${data.invoiceNo}`, {
    x: width - margin - 210,
    y: height - margin - 50,  // ← Moved higher
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
  page.drawText("Bill To:", { x: margin + 12, y: y - 20, size: 13, font: bold, color: rgb(0, 0, 0) });
  drawLines(page, data.billTo, margin + 12, y - 45, font);

  // Ship To
  page.drawRectangle({
    x: margin + boxWidth + margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderWidth: 1.5,
    borderColor: rgb(0, 0, 0),
  });
  page.drawText("Ship To:", { x: margin + boxWidth + margin + 12, y: y - 20, size: 13, font: bold, color: rgb(0, 0, 0) });
  drawLines(page, data.shipTo || data.billTo, margin + boxWidth + margin + 12, y - 45, font);

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

  const headers = ["SKU", "Description", "Qty", "Rate", "Amount"];
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + 12, y: tableTop - 22, size: 12, font: bold, color: rgb(0, 0, 0) });
    x += colWidths[i];
  });

  y = tableTop - 65;

  // Items
  for (const item of data.items) {
    x = margin;
    page.drawText(item.sku || "N/A", { x: x + 12, y, size: 11, font, color: rgb(0, 0, 0) });
    x += colWidths[0];
    page.drawText(item.description, { x: x + 12, y, size: 11, font, color: rgb(0, 0, 0) });
    x += colWidths[1];
    page.drawText(item.qty.toString(), { x: x + 25, y, size: 11, font, color: rgb(0, 0, 0) });
    x += colWidths[2];
    page.drawText(`$${item.rate.toFixed(2)}`, { x: x + 12, y, size: 11, font, color: rgb(0, 0, 0) });
    x += colWidths[3];
    page.drawText(`$${item.amount.toFixed(2)}`, { x: x + 12, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 30;
  }

  page.drawLine({
    start: { x: margin, y: y + 15 },
    end: { x: width - margin, y: y + 15 },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });

  // === FOOTER INFO ===
  y -= 60;
  page.drawText(`DATE: ${data.date}`, { x: margin, y, size: 12, font: bold, color: rgb(0, 0, 0) });
  y -= 24;
  page.drawText(`SALESMAN: ${data.salesman || "LILIAN"}`, { x: margin, y, size: 12, font, color: rgb(0, 0, 0) });
  y -= 24;
  page.drawText(`TIME: ${data.time}`, { x: margin, y, size: 12, font, color: rgb(0, 0, 0) });

  page.drawText("THANK YOU FOR SHOPPING", {
    x: margin,
    y: y - 60,
    size: 18,
    font: bold,
    color: rgb(0.8, 0, 0),
  });

  // === TOTALS BOX — NOW PERFECTLY INSIDE ===
  const totalBoxX = width - margin - 220;
  const totalBoxY = y - 180;
  const boxWidthTotal = 200;
  const boxHeightTotal = 120;

  page.drawRectangle({
    x: totalBoxX,
    y: totalBoxY,
    width: boxWidthTotal,
    height: boxHeightTotal,
    borderWidth: 2.5,
    borderColor: rgb(0, 0, 0),
  });

  let ty = totalBoxY + 85;
  page.drawText("Subtotal", { x: totalBoxX + 20, y: ty, size: 13, font, color: rgb(0, 0, 0) });
  page.drawText(`$${data.subtotal.toFixed(2)}`, { x: totalBoxX + 100, y: ty, size: 13, font, color: rgb(0, 0, 0) });

  ty -= 35;
  page.drawText("Tax", { x: totalBoxX + 20, y: ty, size: 13, font, color: rgb(0, 0, 0) });
  page.drawText(`$${data.tax?.toFixed(2) || "124.11"}`, { x: totalBoxX + 100, y: ty, size: 13, font, color: rgb(0, 0, 0) });

  ty -= 40;
  page.drawText("TOTAL", { x: totalBoxX + 20, y: ty, size: 16, font: bold, color: rgb(0, 0, 0) });
  page.drawText(`$${data.total.toFixed(2)}`, { x: totalBoxX + 100, y: ty, size: 18, font: bold, color: rgb(0, 0, 0) });

  const pdfBytes = await doc.save();

  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${data.invoiceNo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function drawLines(page: any, text: string, x: number, yStart: number, font: any) {
  const lines = text.split("\n").filter(Boolean);
  let y = yStart;
  for (const line of lines) {
    page.drawText(line.trim(), { x, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 19;
  }
}