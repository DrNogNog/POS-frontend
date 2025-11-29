// lib/generateEstimatePdf.ts
"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ItemRow = {
  item: string;
  qty: number | "";
  description: string;
  rate: number | "";
};

type Payload = {
  companyName?: string;
  companyAddr1?: string;
  companyAddr2?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  date?: string;
  estimateNo?: string;
  billTo?: string;
  shipTo?: string;
  items: ItemRow[];
  discountPercent?: number;
};

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export async function generateEstimatePdf(data: Payload & { subtotal: number; discount: number; total: number }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - 60;

  // [Your existing PDF drawing code — keep everything exactly as before]
  // ... (all your beautiful SKN Cabinet layout)

  // === TOTALS BOX (Bottom Right) ===
  const totalBoxX = width - margin - 200;
  const totalBoxY = y - 30;
  const totalBoxWidth = 180;
  const totalBoxHeight = 80;

  page.drawRectangle({
    x: totalBoxX,
    y: totalBoxY,
    width: totalBoxWidth,
    height: totalBoxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const discountTotal = data.discount;
  const grandTotal = data.total;

  let ty = totalBoxY + 55;
  page.drawText("Subtotal", { x: totalBoxX + 10, y: ty, size: 11, font });
  page.drawText(formatCurrency(data.subtotal), { x: totalBoxX + totalBoxWidth - 90, y: ty, size: 11, font });
  ty -= 18;

  if (discountTotal > 0) {
    page.drawText(`Discount`, { x: totalBoxX + 10, y: ty, size: 11, font });
    page.drawText(`-${formatCurrency(discountTotal)}`, { x: totalBoxX + totalBoxWidth - 90, y: ty, size: 11, font });
    ty -= 18;
  }

  page.drawText("Total", { x: totalBoxX + 10, y: ty, size: 13, font: bold });
  page.drawText(formatCurrency(grandTotal), { x: totalBoxX + totalBoxWidth - 100, y: ty, size: 13, font: bold });

  // Finalize PDF
  const pdfBytes = await doc.save();

  // 1. Let user download
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estimate-${data.estimateNo || "draft"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  // 2. SAVE TO DATABASE
  try {
    await fetch("http://localhost:4000/api/estimates/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimateNo: data.estimateNo || `EST-${Date.now()}`,
        date: data.date,
        billTo: data.billTo,
        shipTo: data.shipTo,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        customer: data.billTo?.split("\n")[0] || "Customer",
        pdfData: btoa(String.fromCharCode(...new Uint8Array(pdfBytes))), // base64
      }),
    });
  } catch (err) {
    console.error("Failed to save estimate to DB:", err);
  }
}

// Keep your drawMultilineText helper
function drawMultilineText(page: any, text: string, x: number, yStart: number, size: number, font: any, lineHeight: number) {
  const lines = text.split("\n");
  let y = yStart;
  for (const line of lines) {
    page.drawText(line.trim(), { x, y, size, font });
    y -= lineHeight;
  }
}