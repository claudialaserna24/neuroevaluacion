import { createHash, createHmac, timingSafeEqual } from "crypto";

export type WompiEnvironment = "sandbox" | "production";

export interface WompiConfig {
  publicKey: string;
  privateKey: string;
  integrityKey: string;
  eventsKey: string;
  environment: WompiEnvironment;
}

export function getWompiConfig(): WompiConfig {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  const integrityKey = process.env.WOMPI_INTEGRITY_KEY;
  const eventsKey = process.env.WOMPI_EVENTS_KEY;
  const environment = (process.env.WOMPI_ENVIRONMENT ?? "sandbox") as WompiEnvironment;

  if (!publicKey || !privateKey || !integrityKey || !eventsKey) {
    throw new Error("Wompi credentials are not fully configured");
  }
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error(`Invalid WOMPI_ENVIRONMENT: ${environment}`);
  }

  return { publicKey, privateKey, integrityKey, eventsKey, environment };
}

export function isWompiConfigured(): boolean {
  return Boolean(
    process.env.WOMPI_PUBLIC_KEY &&
      process.env.WOMPI_PRIVATE_KEY &&
      process.env.WOMPI_INTEGRITY_KEY &&
      process.env.WOMPI_EVENTS_KEY &&
      process.env.WOMPI_ENVIRONMENT,
  );
}

export function getWompiApiBaseUrl(env?: WompiEnvironment): string {
  const environment = env ?? ((process.env.WOMPI_ENVIRONMENT ?? "sandbox") as WompiEnvironment);
  return environment === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

/**
 * Wompi integrity signature: SHA-256 of
 * `<reference><amountInCents><currency><integritySecret>` (optionally with an
 * expiration timestamp). See https://docs.wompi.co/docs/colombia/widget-checkout-web/#firma-de-integridad
 */
export function generateIntegritySignature(input: {
  reference: string;
  amountInCents: number;
  currency: string;
  expirationTime?: string;
}): string {
  const { integrityKey } = getWompiConfig();
  const base = input.expirationTime
    ? `${input.reference}${input.amountInCents}${input.currency}${input.expirationTime}${integrityKey}`
    : `${input.reference}${input.amountInCents}${input.currency}${integrityKey}`;
  return createHash("sha256").update(base).digest("hex");
}

/**
 * Verify a Wompi event webhook signature. Wompi sends the checksum in the
 * event body (`signature.checksum`) as SHA-256 of the concatenated property
 * values plus `timestamp` plus the events secret.
 */
export function verifyEventSignature(params: {
  properties: string[];
  values: (string | number)[];
  timestamp: number | string;
  checksum: string;
}): boolean {
  const { eventsKey } = getWompiConfig();
  const concatenated = params.values.map(String).join("") + String(params.timestamp) + eventsKey;
  const expected = createHash("sha256").update(concatenated).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.checksum, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * HMAC-SHA256 helper for any custom signing needs against the events key.
 */
export function hmacEventsKey(payload: string): string {
  const { eventsKey } = getWompiConfig();
  return createHmac("sha256", eventsKey).update(payload).digest("hex");
}