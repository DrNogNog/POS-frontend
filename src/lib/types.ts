// Shapes of the data the API sends back. Money arrives as strings.
export type Money = string | number;

export type Role = "OWNER" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "WORKER";
/** How the customer is paying — recorded on estimates and invoices. */
export type CardType = "CREDIT" | "DEBIT";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  active?: boolean;
}

export interface Store {
  id: string;
  name: string;
}

export interface PriceTier {
  code: string;
  name: string;
  markupPct: Money;
  sortOrder: number;
  description: string;
}

export interface TaxRate {
  id: number;
  name: string;
  ratePct: Money;
  isDefault: boolean;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface Account {
  code: string;
  name: string;
  type: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  costingMethod: "FIFO" | "LIFO" | "WAC";
  defaultCustomerTermsDays: number;
  earlyPayDiscountPct: Money;
  earlyPayDiscountDays: number;
  lateFeePct: Money;
  lateFeeFlat: Money;
  collectionsAfterDays: number;
  arHighDso: number;
  arLowDso: number;
  invoicePrefix: string;
  estimatePrefix: string;
  poPrefix: string;
}

export interface SettingsBundle {
  settings: StoreSettings;
  taxRates: TaxRate[];
  priceTiers: PriceTier[];
  accounts: Account[];
  categories: Category[];
}

export interface Supplier {
  id: number;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  accountNumber: string;
  paymentTermsDays: number;
  tradeDiscountPct: Money;
  earlyPayDiscountPct: Money;
  earlyPayDiscountDays: number;
  lateFeePct: Money;
  lateFeeFlat: Money;
  contractStart: string | null;
  contractEnd: string | null;
  contractNotes: string;
  rating: number | null;
  notes: string;
  active: boolean;
  balance?: number;
  overdue?: number;
  productCount?: number;
}

export interface Product {
  id: number;
  itemCode: string;
  name: string;
  description: string;
  categoryId: number | null;
  supplierId: number | null;
  category?: { id: number; name: string } | null;
  supplier?: { id: number; name: string } | null;
  collection: string;
  unit: string;
  listPrice: Money;
  supplierDiscountPct: Money;
  unitCost: Money;
  sellPriceOverride: Money | null;
  taxable: boolean;
  qtyOnHand: Money;
  reorderPoint: Money;
  reorderQty: Money;
  images: string[];
  /** When the stock came in (latest arrival); null when unknown */
  dateIn: string | null;
  /** Stock from before the POS system */
  oldInventory: boolean;
}

export interface Customer {
  id: number;
  name: string;
  company: string;
  phone: string;
  fax: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryNotes: string;
  priceTierCode: string;
  termsDays: number;
  creditLimit: Money;
  taxExempt: boolean;
  taxExemptId: string;
  cardBrand: string;
  cardLast4: string;
  cardExp: string;
  cardToken: string;
  notes: string;
  active: boolean;
  balance?: number;
  lastPurchase?: string | null;
  lifetimeSales?: number;
}

export interface DocLine {
  id?: number;
  productId: number | null;
  itemCode: string;
  description: string;
  qty: Money;
  unitPrice: Money;
  lineTotal?: Money;
  unitCost?: Money;
}

export interface Payment {
  id: number;
  date: string;
  amount: Money;
  discountTaken: Money;
  method: string;
  reference: string;
  createdBy: string;
}

export interface Invoice {
  id: number;
  invoiceNo: string;
  customerId: number | null;
  customer?: { id: number; name: string; phone?: string } | null;
  issueDate: string;
  dueDate: string;
  termsDays: number;
  billTo: string;
  shipTo: string;
  phone: string;
  fax: string;
  cardType: CardType | null;
  fulfillment: "PICKUP" | "DELIVERY";
  salesperson: string;
  subtotal: Money;
  discountAmount: Money;
  taxRatePct: Money;
  taxAmount: Money;
  total: Money;
  cogsTotal: Money;
  amountPaid: Money;
  discountsTaken: Money;
  lateFees: Money;
  writtenOff: Money;
  earlyPayDiscountPct: Money;
  earlyPayDiscountDays: number;
  status: "OPEN" | "PARTIAL" | "PAID" | "VOID";
  collectionStatus: "NONE" | "LATE_FEE" | "COLLECTIONS" | "WRITTEN_OFF";
  notes: string;
  balance: number;
  daysPastDue: number;
  isOverdue: boolean;
  earlyDiscountAvailableNow: boolean;
  earlyDiscountAmount: number;
  earlyDiscountDeadline: string | null;
  lines?: DocLine[];
  payments?: Payment[];
  adjustments?: { id: number; type: string; amount: Money; note: string; createdAt: string; createdBy: string }[];
  estimate?: { id: number; estimateNo: string; approvedAt?: string | null } | null;
  bucket?: string;
}

export interface Estimate {
  id: number;
  estimateNo: string;
  customerId: number | null;
  customer?: { id: number; name: string } | null;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "INVOICED";
  billTo: string;
  shipTo: string;
  phone: string;
  fax: string;
  cardType: CardType | null;
  fulfillment: "PICKUP" | "DELIVERY";
  priceTierCode: string;
  subtotal: Money;
  discountAmount: Money;
  taxRatePct: Money;
  taxAmount: Money;
  total: Money;
  notes: string;
  lines?: DocLine[];
  invoice?: { id: number; invoiceNo: string } | null;
}

export interface Bill {
  id: number;
  billNo: string;
  supplierId: number;
  supplier: { id: number; name: string };
  purchaseOrder?: { id: number; poNo: string } | null;
  billDate: string;
  dueDate: string;
  termsDays: number;
  expenseAccountCode: string;
  subtotal: Money;
  freight: Money;
  taxAmount: Money;
  total: Money;
  tradeDiscount: Money;
  amountPaid: Money;
  discountsTaken: Money;
  lateFees: Money;
  earlyPayDiscountPct: Money;
  earlyPayDiscountDays: number;
  status: "OPEN" | "PARTIAL" | "PAID" | "VOID";
  notes: string;
  balance: number;
  daysPastDue: number;
  isOverdue: boolean;
  earlyDiscountAvailableNow: boolean;
  earlyDiscountAmount: number;
  earlyDiscountDeadline: string | null;
  bucket?: string;
  payments?: Payment[];
}

export type Aging = { current: number; "1-30": number; "31-60": number; "61-90": number; "90+": number; total: number };
