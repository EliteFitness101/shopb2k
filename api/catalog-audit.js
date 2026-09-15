const SUPABASE_CATALOG = 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/storefront-products?limit=200';
const MEDIA_BRIDGE = 'https://reso-flex.vercel.app/api/catalog-assets';
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [catalogResponse, bridgeResponse] = await Promise.all([fetch(SUPABASE_CATALOG), fetch(MEDIA_BRIDGE)]);
    const catalogText = await catalogResponse.text(), bridgeText = await bridgeResponse.text();
    if (!catalogResponse.ok) throw new Error(`Supabase catalog HTTP ${catalogResponse.status}: ${catalogText.slice(0, 300)}`);
    if (!bridgeResponse.ok) throw new Error(`Media bridge HTTP ${bridgeResponse.status}: ${bridgeText.slice(0, 300)}`);
    const catalog = JSON.parse(catalogText), bridge = JSON.parse(bridgeText), products = catalog.products || catalog.data || [], list = Array.isArray(products) ? products : [], verified = bridge.imagekit?.verified || {};
    const media = list.map((p) => { const m = (p.sku && verified[p.sku]) || Object.values(verified).find((v) => norm(v.slug) === norm(p.handle) || norm(v.name) === norm(p.title)) || null; const roles = m ? Object.keys(m.assets || {}).filter((r) => m.assets[r]) : []; return { sku: p.sku, handle: p.handle, title: p.title, imagekitRoles: roles, imagekitComplete: roles.length >= 6 }; });
    return res.status(200).json({ generatedAt: new Date().toISOString(), supabase: { http: catalogResponse.status, count: list.length }, imagekit: { verifiedProducts: Object.keys(verified).length, sixAssetProducts: media.filter((p) => p.imagekitComplete).length, matchedProducts: media.filter((p) => p.imagekitRoles.length > 0).length }, paystack: { extractedProducts: bridge.paystack?.count ?? 0 }, blob: bridge.blob, products: media });
  } catch (error) { return res.status(502).json({ error: 'Catalog audit failed', message: error instanceof Error ? error.message : 'Unknown error' }); }
}
