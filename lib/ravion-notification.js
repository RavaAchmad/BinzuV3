export const RAVION_NOTIFICATION_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "ORDER_PROVISIONING",
  "ORDER_PROVISIONED",
  "ORDER_FAILED",
]);

function formatRupiah(amount) {
  if (amount === undefined || amount === null || amount === "") return "-";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function valueOrFallback(value, fallback = "-") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

export function normalizeRavionNumber(number) {
  if (typeof number !== "string" && typeof number !== "number") return "";

  const normalized = String(number).trim();
  if (!/^62\d{8,14}$/.test(normalized)) return "";

  return normalized;
}

export function validateRavionNotificationBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be an object" };
  }

  const { event, number, payload } = body;
  if (!event || !RAVION_NOTIFICATION_EVENTS.has(event)) {
    return { ok: false, error: "Invalid or missing event" };
  }

  const normalizedNumber = normalizeRavionNumber(number);
  if (!normalizedNumber) {
    return { ok: false, error: "Invalid or missing number. Use 62 format, example 6281234567890." };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid or missing payload" };
  }

  if (!payload.customerName || !payload.orderId || !payload.productName) {
    return {
      ok: false,
      error: "Missing required payload fields",
      required: ["customerName", "orderId", "productName"],
    };
  }

  return {
    ok: true,
    data: {
      event,
      number: normalizedNumber,
      payload,
    },
  };
}

export function buildRavionNotificationMessage(event, payload) {
  const customerName = valueOrFallback(payload.customerName, "Pelanggan");
  const orderId = valueOrFallback(payload.orderId);
  const productName = valueOrFallback(payload.productName);
  const amount = formatRupiah(payload.amount);
  const serverName = valueOrFallback(payload.serverName);
  const panelUrl = valueOrFallback(payload.panelUrl);
  const username = valueOrFallback(payload.username);
  const email = valueOrFallback(payload.email);
  const password = valueOrFallback(payload.password);
  const noteRules = payload.noteRules
    ? `\n\nNote Rules:\n${payload.noteRules}`
    : "";
  const customMessage = payload.message ? `\n\nCatatan:\n${payload.message}` : "";

  switch (event) {
    case "PAYMENT_RECEIVED":
      return `Halo ${customerName}, pembayaran untuk order ${orderId} sudah kami terima.

Paket: ${productName}
Total: ${amount}

Pesanan Anda sedang diproses untuk pembuatan layanan.${customMessage}`;

    case "ORDER_PROVISIONING":
      return `Halo ${customerName}, order ${orderId} sedang diproses.

Tim sistem Ravion sedang menyiapkan layanan:
${productName}

Anda akan menerima update berikutnya saat server selesai dibuat.${customMessage}`;

    case "ORDER_PROVISIONED":
      return `Halo ${customerName}, layanan Anda sudah aktif.

Order: ${orderId}
Server: ${serverName}
Panel: ${panelUrl}

username: ${username}
email: ${email}
password: ${password}
Paket: ${productName}

Silakan login ke panel Ravion untuk melanjutkan setup.${customMessage}${noteRules}`;

    case "ORDER_FAILED":
      return `Halo ${customerName}, kami menerima pembayaran untuk order ${orderId}, tetapi sistem mengalami kendala saat membuat layanan.

Silakan hubungi support Ravion agar pesanan Anda segera dicek.${customMessage}`;

    default:
      return payload.message || `Update order Ravion ${orderId}: ${productName}`;
  }
}
