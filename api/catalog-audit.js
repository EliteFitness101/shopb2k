const SUPABASE_CATALOG = 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/storefront-products?limit=200';
const MEDIA_BRIDGE = 'https://reso-flex.vercel.app/api/catalog-assets';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [catalogResponse, bridgeResponse] = await Promise.all([fetch(SUPABASE_CATALOG), fetch(MEDIA_BRIDGE)]);
    const catalogText = await catalogResponse.text();
    const bridgeText = await bridgeResponse.text();
    if (!catalogResponse.ok) throw new Error(`Supabase catalog HTTP ${catalogResponse.status}: ${catalogText.slice(0, 300)}`);
    if (!bridgeResponse.ok) throw new Error(`Media bridge HTTP ${bridgeResponse.status}: ${bridgeText.slice(0, 300)}`);
    const catalog = JSON.parse(catalogText);
    const bridge = JSON.parse(bridgeText);
    const products = catalog.products || catalog.data || [];
    const list = Array.isArray(products) ? products : [];
    const verified = bridge.imagekit?.verified || {};
    const media = list.map((p) => {
      const m = (p.sku && verified[p.sku]) || null;
      return { sku: p.sku, handle: p.handle, title: p.title, imagekitRoles: m ? Object.keys(m.assets || {}).filter((r) => m.assets[r]) : [], imagekitComplete: Boolean(m && Object.keys(m.assets || {}).filter((r) => m.assets[r]).length >= 6) };
    });
    return res.status(200).json({ generatedAt: new Date().toISOString(), supabase: { http: catalogResponse.status, count: list.length }, imagekit: { verifiedProducts: Object.keys(verified).length, sixAssetProducts: media.filter((p) => p.imagekitComplete).length, matchedProducts: media.filter((p) => p.imagekitRoles.length > 0).length }, paystack: { extractedProducts: bridge.paystack?.count ?? 0 }, blob: bridge.blob, products: media });
  } catch (error) { return res.status(502).json({ error: 'Catalog audit failed', message: error instanceof Error ? error.message : 'Unknown error' }); }
}
