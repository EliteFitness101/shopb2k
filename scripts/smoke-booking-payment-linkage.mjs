#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const [webhook, makaveliCheckout, resonanceCheckout] = await Promise.all([
  fs.readFile(new URL("../src/routes/api.makaveli.paystack-webhook.ts", import.meta.url), "utf8"),
  fs.readFile(new URL("../src/routes/api.makaveli.checkout.ts", import.meta.url), "utf8"),
  fs.readFile(new URL("../src/routes/api.resonance.checkout.ts", import.meta.url), "utf8"),
]);
const checkoutSources = makaveliCheckout + "\\n" + resonanceCheckout;

const contracts = [
  ["canonical booking reference lookup", '.eq("booking_reference",reference)'],
  ["legacy payment reference fallback", '.eq("payment_reference",reference)'],
  ["Both booking checkouts surface reference persistence errors", "if(referenceUpdateError)throw referenceUpdateError"],
  ["Paystack signature verification before processing", "validSignature(raw,request.headers.get(\"x-paystack-signature\")"],
  ["successful NGN charge and exact amount verification", 'event.data?.status==="success"&&event.data?.currency==="NGN"&&Number(event.data?.amount)===expected'],
  ["booking email binding", 'String(event.data?.customer?.email??"").toLowerCase()===String(booking.customer_email).toLowerCase()'],
  ["booking update error is surfaced", "if(bookingUpdateError)throw bookingUpdateError"],
  ["canonical payment write error is surfaced", "if(paymentError)throw paymentError"],
  ["revenue ledger write error is surfaced", "if(revenueError)throw revenueError"],
  ["fulfillment is keyed by payment reference", '.eq("payment_reference",reference)'],
  ["fulfillment item replay check", "existingItem"],
  ["fulfillment event replay check", "existingEvent"],
];

let failed = 0;
for (const [name, needle] of contracts) {
  const source = name.includes("checkout") || name.includes("checkouts") ? checkoutSources : webhook;
  const pass = source.includes(needle);
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failed++;
}
assert.equal(failed, 0, `Booking payment-linkage contract failures: ${failed}`);
console.log(`PASS all ${contracts.length} booking payment-linkage contracts`);
