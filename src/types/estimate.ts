export type Payload = {
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
  invoiceNo: string;
  salesman?: string; // ← Add this line
  time?: string;    // ← Add this line
  tax?: number;
};
export type ItemRow = {
  item: string;
  qty: number | "";
  description: string;
  rate: number | "";
};