/**
 * ResoFlex™ Automated Supabase to Shopify Migration Engine
 * * Runs automatically in the background to fetch historical orders from Supabase 
 * and create them directly in Shopify via the Admin REST API.
 * * Usage:
 * 1. Ensure env vars are set:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SHOPIFY_STORE_DOMAIN (e.g., resofit.myshopify.com)
 * - SHOPIFY_ADMIN_ACCESS_TOKEN (shpat_...)
 * 2. Run: node scripts/auto_migrate_to_shopify.js
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "your-service-role-key";
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || "resofit.myshopify.com";
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function autoMigrate() {
  console.log("=================================================");
  console.log("🚀 Starting Automated ResoFlex -> Shopify Migration");
  console.log("=================================================");

  // 1. Fetch all order events from Supabase
  const { data: events, error } = await supabase
    .from("resofit_events")
    .select("*")
    .or("event_name.eq.checkout.order_paid,event_name.eq.order.completed")
    .order("occurred_at", { ascending: true });

  if (error) {
    console.error("❌ Supabase query failed:", error);
    return;
  }

  console.log(`📦 Found ${events.length} historical orders to migrate.`);

  let successCount = 0;
  let skipCount = 0;

  for (const [index, event] of events.entries()) {
    const payload = event.payload || {};
    const customerEmail = payload.customer_email || event.user_id || "member@resofit.fit";
    const nameParts = (payload.customer_name || "ResoFlex Member").split(" ");
    const firstName = nameParts[0] || "ResoFlex";
    const lastName = nameParts.slice(1).join(" ") || "Member";

    const shopifyOrderPayload = {
      order: {
        email: customerEmail,
        financial_status: "paid",
        fulfillment_status: "fulfilled",
        currency: payload.currency || "NGN",
        processed_at: event.occurred_at || new Date().toISOString(),
        tags: "Historical_Migration, Automated_Import, Supabase",
        note: `Auto-migrated from Supabase Event ID: ${event.id}`,
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: customerEmail,
        },
        line_items: [
          {
            title: payload.product_title || "ResoFlex Digital Membership / Blueprint",
            price: payload.total_price || payload.amount || "0.00",
            quantity: 1,
          },
        ],
        send_receipt: false,
        send_fulfillment_receipt: false,
      },
    };

    try {
      // 2. Post directly to Shopify Admin REST API
      const response = await fetch(
        `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-07/orders.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
          },
          body: JSON.stringify(shopifyOrderPayload),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`[${index + 1}/${events.length}] ✅ Migrated Order #${result.order.order_number} (${customerEmail})`);
        successCount++;
      } else {
        const errText = await response.text();
        console.warn(`[${index + 1}/${events.length}] ⚠️ Shopify response error:`, errText);
        skipCount++;
      }
    } catch (err) {
      console.error(`[${index + 1}/${events.length}] ❌ Failed to push order:`, err);
      skipCount++;
    }

    // Rate limiting pause (250ms) to prevent Shopify throttle
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log("=================================================");
  console.log(`🎉 Migration Complete! Success: ${successCount} | Failed/Skipped: ${skipCount}`);
  console.log("=================================================");
}

autoMigrate();

