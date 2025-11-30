export interface ProductChangeLog {
  timestamp: string;
  action: "CREATE" | "UPDATE" | "DUPLICATE" | "DELETE";
  productId: string;
  changes?: Partial<any>; // changed fields
}

export const productChangeLogs: ProductChangeLog[] = [];

export const logProductChange = (
  action: ProductChangeLog["action"],
  productId: string,
  changes?: Partial<any>
) => {
  const logEntry: ProductChangeLog = {
    timestamp: new Date().toISOString(),
    action,
    productId,
    changes,
  };
  productChangeLogs.push(logEntry);
  console.log("Product change logged:", logEntry);
};
