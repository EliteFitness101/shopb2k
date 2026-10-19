export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, reason: "GET_required" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ ok: false, reason: "OPENAI_API_KEY_missing" });
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12000),
    });
    const body: any = await response.json().catch(() => ({}));
    return res.status(200).json({
      configured: true,
      api_status: response.status,
      authorized: response.ok,
      model_count: Array.isArray(body.data) ? body.data.length : 0,
      error_type: body.error?.type ?? null,
      error_code: body.error?.code ?? null,
    });
  } catch {
    return res.status(502).json({ configured: true, authorized: false, reason: "provider_network_error" });
  }
}
