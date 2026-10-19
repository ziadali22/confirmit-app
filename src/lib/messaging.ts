// Render a brand's configured interactive-list message for an order.

type OrderCtx = {
  firstName: string;
  fullName: string;
  shopName: string;
  orderNumber: string;
  total: string;
  currency: string;
};

type OrderLike = {
  externalId: string;
  id: number;
  total: number;
  currency: string;
  customer: { name: string };
  brand: { name: string };
};

export function contextFor(order: OrderLike): OrderCtx {
  const name = (order.customer.name || "").trim();
  return {
    firstName: name ? name.split(" ")[0] : "",
    fullName: name,
    shopName: order.brand.name,
    orderNumber: order.externalId || String(order.id),
    total: String(order.total),
    currency: order.currency,
  };
}

/** Replace {key} tokens; leave unknown tokens untouched (never throw). */
export function render(text: string, ctx: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in ctx ? ctx[k] : m));
}

export type RenderedOption = {
  rowId: string;
  label: string;
  tag: string;
  response: string;
  action: string;
};

export type RenderedMessage = {
  header: string;
  body: string;
  sectionTitle: string;
  buttonText: string;
  options: RenderedOption[];
};

type TemplateLike = {
  header: string;
  body: string;
  sectionTitle: string;
  buttonText: string;
  options: {
    id: number;
    label: string;
    orderTag: string;
    responseMessage: string;
    action: string;
  }[];
};

export function renderMessage(order: OrderLike, template: TemplateLike): RenderedMessage {
  const ctx = contextFor(order);
  const options = [...template.options]
    .sort((a, b) => a.id - b.id)
    .map((o) => ({
      rowId: `opt_${o.id}`,
      label: render(o.label, ctx),
      tag: o.orderTag,
      response: render(o.responseMessage, ctx),
      action: o.action,
    }));
  return {
    header: render(template.header, ctx),
    body: render(template.body, ctx),
    sectionTitle: render(template.sectionTitle, ctx),
    buttonText: template.buttonText || "Select",
    options,
  };
}

/** Minimal WhatsApp text formatting -> HTML, for the live preview only. */
export function waToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*(.+?)\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/~(.+?)~/g, "<s>$1</s>")
    .replace(/\n/g, "<br/>");
}
