// lib/generateEstimatePdf.ts
"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Payload = {
  companyName?: string;
  companyAddr1?: string;
  phone?: string;
  email?: string;
  website?: string;
  date?: string;
  estimateNo?: string;
  billTo?: string;
  shipTo?: string;
  items: { item: string; qty: number | ""; description: string; rate: number | "" }[];
  subtotal: number;
  discount: number;
  total: number;
};

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export async function generateEstimatePdf(data: Payload) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // COMPANY HEADER (Left)
  page.drawText(data.companyName || "", {
    x: margin,
    y,
    size: 16,
    font: bold,
  });
  y -= 20;
  page.drawText(data.companyAddr1 || "", { x: margin, y, size: 11, font });
  y -= 18;
  page.drawText(`Phone #: ${data.phone || ""}`, { x: margin, y, size: 11, font });

  // EMAIL & WEBSITE (Center)
  const centerX = width / 2 - 40;
  y = height - margin - 5;

  page.drawText("E-mail", { x: centerX-80, y, size: 11, font });
  page.drawText(data.email || "", {
    x: centerX-30,
    y,
    size: 11,
    font,
    color: rgb(0, 0.3, 0.8),
  });

  page.drawText("Web Site", { x: centerX-80, y: y - 20, size: 11, font });
  page.drawText(data.website || "", {
    x: centerX-30,
    y: y - 20,
    size: 11,
    font,
    color: rgb(0, 0.3, 0.8),
  });

  // ESTIMATE TITLE + BOX (Top Right)
  page.drawText("Estimate", {
    x: width - margin - 120,
    y: height - margin,
    size: 20,
    font: bold,
  });

  const boxX = width - margin - 180;
  const boxY = height - margin - 70;
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: 160,
    height: 50,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawText("Date", { x: boxX + 10, y: boxY + 30, size: 11, font });
  page.drawText(data.date || new Date().toISOString().slice(0, 10), {
    x: boxX + 90,
    y: boxY + 30,
    size: 11,
    font,
  });

  page.drawText("Estimate #", { x: boxX + 10, y: boxY + 8, size: 11, font });
  page.drawText(data.estimateNo || "1", {
    x: boxX + 90,
    y: boxY + 8,
    size: 11,
    font,
  });

  // BILL TO & SHIP TO BOXES — FIXED: NO OVERLAP!
  y = height - margin - 120;

  const boxWidth = (width - 3 * margin) / 2;
  const boxHeight = 90;

  // Bill To Box
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText("Name / Address", { x: margin + 10, y: y - 18, size: 11, font: bold });

  const billLines = (data.billTo || "").split("\n");
  let by = y - 38;
  for (const line of billLines) {
    if (line.trim()) {
      page.drawText(line.trim(), { x: margin + 10, y: by, size: 11, font });
      by -= 18;
    }
  }

  // Ship To Box
  page.drawRectangle({
    x: margin + boxWidth + margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawText("Ship To", { x: margin + boxWidth + margin + 10, y: y - 18, size: 11, font: bold });

  const shipLines = (data.shipTo || data.billTo || "").split("\n");
  let sy = y - 38;
  for (const line of shipLines) {
    if (line.trim()) {
      page.drawText(line.trim(), { x: margin + boxWidth + margin + 10, y: sy, size: 11, font });
      sy -= 18;
    }
  }

  // TABLE
  y = y - boxHeight - 30;
  const tableTop = y;

  // Header background
  page.drawRectangle({
    x: margin,
    y: tableTop - 25,
    width: width - 2 * margin,
    height: 25,
    color: rgb(0.9, 0.9, 0.9),
  });

  const headers = ["Item", "Qty", "Description", "Rate", "Total"];
  const colWidths = [80, 60, 220, 80, 100];
  let x = margin;
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + 8, y: tableTop - 15, size: 11, font: bold });
    x += colWidths[i];
  });

  page.drawLine({ start: { x: margin, y: tableTop - 25 }, end: { x: width - margin, y: tableTop - 25 }, thickness: 1 });

  y = tableTop - 50;

  // Table Rows
  for (const item of data.items) {
    if (!item.item && !item.qty && !item.rate) continue;
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
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

  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: width - margin, y: y + 10 }, thickness: 1 });

  // TOTALS BOX
  const totalBoxX = width - margin - 200;
  const totalBoxY = y - 80;
  const totalBoxWidth = 180;
  const totalBoxHeight = data.discount > 0 ? 100 : 80;

  page.drawRectangle({
    x: totalBoxX,
    y: totalBoxY,
    width: totalBoxWidth,
    height: totalBoxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1.5,
  });

  let ty = totalBoxY + totalBoxHeight - 30;
  page.drawText("Subtotal", { x: totalBoxX + 15, y: ty, size: 12, font });
  page.drawText(formatCurrency(data.subtotal), { x: totalBoxX + totalBoxWidth - 100, y: ty, size: 12, font });
  ty -= 28;

  if (data.discount > 0) {
    page.drawText("Discount", { x: totalBoxX + 15, y: ty, size: 12, font });
    page.drawText(`-${formatCurrency(data.discount)}`, { x: totalBoxX + totalBoxWidth - 100, y: ty, size: 12, font });
    ty -= 28;
  }

  page.drawText("Total", { x: totalBoxX + 15, y: ty, size: 14, font: bold });
  page.drawText(formatCurrency(data.total), { x: totalBoxX + totalBoxWidth - 110, y: ty, size: 14, font: bold });

  // FINALIZE & SAVE
  const pdfBytes = await doc.save();

  // Download
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estimate-${data.estimateNo || "draft"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  // Save to DB
  try {
    await fetch("http://localhost:4000/api/estimates/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimateNo: data.estimateNo?.trim() || null,
        date: data.date,
        billTo: data.billTo,
        shipTo: data.shipTo,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        customer: data.companyName || data.billTo?.split("\n")[0] || "Customer",
        pdfData: btoa(String.fromCharCode(...pdfBytes)),
      }),
    });
  } catch (err) {
    console.error("Save failed:", err);
  }
}