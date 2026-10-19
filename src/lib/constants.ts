// Shared string constants (SQLite has no enums).

export const ORDER_STATUS = {
  RECEIVED: "received",
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  SHIPPED: "shipped",
} as const;

export const STATUS_LABEL: Record<string, string> = {
  received: "Received",
  confirming: "Awaiting reply",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  shipped: "Shipped",
};

export const OPTION_ACTION = {
  CONFIRM: "confirm",
  CANCEL: "cancel",
  CUSTOM: "custom",
} as const;

// Meta WhatsApp field limits (validate against these, never silently truncate).
export const LIMITS = {
  header: 60,
  body: 1024,
  button: 20,
  section: 24,
  rowTitle: 24,
  maxRows: 10,
};

export const PLACEHOLDERS = [
  "firstName",
  "fullName",
  "shopName",
  "orderNumber",
  "total",
  "currency",
];
