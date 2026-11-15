const ALLOWED_ORIGINS = [
  "https://chkrr2527-lab.github.io"
];
const MODEL = "gemini-2.5-flash-lite";
const MAX_IMAGE_CHARS = 9_000_000;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}

function isValidBase64(value) {
  return typeof value === "string" &&
    value.length > 100 &&
    value.length <= MAX_IMAGE_CHARS &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "Trading Vision AI", model: MODEL, apiKeyConfigured: Boolean(env.GEMINI_API_KEY) }, 200, origin);
    }

    if (request.method !== "POST" || url.pathname !== "/analyze") {
      return json({ error: "Not found" }, 404, origin);
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "AI service is not configured. Add GEMINI_API_KEY as a Cloudflare Worker Secret." }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON request" }, 400, origin);
    }

    const { imageBase64, mimeType, symbol, timeframe, tradeStyle, currentPrice, notes } = body || {};
    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(mimeType) || !isValidBase64(imageBase64)) {
      return json({ error: "กรุณาส่งภาพ JPG, PNG หรือ WEBP ที่มีขนาดไม่เกิน 6 MB" }, 400, origin);
    }

    const prompt = `คุณคือ TRADING VISION AI PRO ผู้ช่วยวิเคราะห์กราฟอย่างระมัดระวัง
วิเคราะห์จากภาพที่แนบเท่านั้น ห้ามอ้างว่ามีข้อมูลราคา Live, OHLC, Volume หรือ Indicator ที่ไม่ได้ให้มา
บริบท: Symbol=${symbol || "XAUUSD"}, Timeframe=${timeframe || "ไม่ทราบ"}, Style=${tradeStyle || "professional"}
ราคาที่ผู้ใช้กรอก (ถ้ามี): ${currentPrice || "ไม่ได้ระบุ"}
หมายเหตุ: ${notes || "ไม่มี"}

กติกาความแม่นยำ:
- อ่านตัวเลขจากแกนราคา/ป้ายราคาเฉพาะที่เห็นชัด ถ้าอ่านไม่ได้ให้ระบุว่าอ่านไม่ได้ ห้ามเดา
- แยก "สิ่งที่เห็นในภาพ" กับ "ข้อสันนิษฐาน/การตีความ"
- วิเคราะห์ Trend, Market Structure (HH/HL/LH/LL), BOS/CHOCH/MSS, Support/Resistance, Supply/Demand, OB, FVG, Liquidity Sweep และ Candlestick เฉพาะเมื่อภาพมีหลักฐานพอ
- EMA/RSI/MACD/BB/Volume/Divergence ให้รายงานเฉพาะเมื่อมองเห็นในภาพ
- ห้ามสร้าง Entry/SL/TP เป็นตัวเลขหากระดับราคาอ่านไม่ได้หรือสเกลไม่ชัด ให้ WAIT และบอกว่าต้องการข้อมูลอะไร
- ถ้าภาพไม่ชัดหรือ timeframe ไม่ชัด ให้ WAIT
- ไม่รับประกันผลกำไร และไม่ส่งคำสั่งซื้อขาย

ตอบเป็นภาษาไทยด้วยรูปแบบ:
1) สถานะข้อมูลภาพและข้อจำกัด
2) แนวโน้ม/โครงสร้างตลาด
3) แนวรับ-แนวต้าน และ SMC ที่พบ (ระบุราคาเฉพาะที่อ่านได้)
4) สัญญาณแท่งเทียน/อินดิเคเตอร์ที่เห็น
5) แผนเทรด: BUY / SELL / WAIT, เงื่อนไขเข้า, Entry, SL, TP1, TP2, RR (ถ้าคำนวณได้)
6) จุดยกเลิกแผนและความเสี่ยง
7) ความมั่นใจ: ต่ำ/กลาง/สูง พร้อมเหตุผล

เริ่มต้นด้วยคำว่า "วิเคราะห์จากภาพเท่านั้น — ยังไม่ใช่ข้อมูลตลาดสด"`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1800
            }
          })
        }
      );

      const result = await response.json();
      if (!response.ok) {
        const message = result?.error?.message || "Gemini API request failed";
        return json({ error: message }, response.status === 429 ? 429 : 502, origin);
      }

      const analysis = result?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim();

      if (!analysis) {
        return json({ error: "AI ไม่ส่งผลวิเคราะห์กลับมา กรุณาลองใหม่ด้วยภาพที่ชัดขึ้น" }, 502, origin);
      }

      return json({
        ok: true,
        model: MODEL,
        source: "image_only",
        liveMarketData: false,
        analysis
      }, 200, origin);
    } catch (error) {
      return json({ error: "เชื่อมต่อ AI ไม่สำเร็จ: " + (error?.message || "unknown error") }, 502, origin);
    }
  }
};
