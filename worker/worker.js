const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new Error("Telegram secrets are not configured");
  }
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true
      })
    }
  );
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || "Telegram API request failed");
  }
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "Personal Gold AI API",
        telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        time: new Date().toISOString()
      });
    }

    if (request.method === "POST" && url.pathname === "/api/telegram/test") {
      if (!env.SETUP_KEY || request.headers.get("Authorization") !== `Bearer ${env.SETUP_KEY}`) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
      try {
        const body = await request.json().catch(() => ({}));
        const message = typeof body.message === "string" && body.message.trim()
          ? body.message.trim().slice(0, 3500)
          : "✅ Personal Gold AI: เชื่อมต่อ Telegram สำเร็จแล้ว";
        await sendTelegram(env, message);
        return json({ ok: true, message: "Telegram message sent" });
      } catch (error) {
        return json({ ok: false, error: error.message }, 502);
      }
    }

    if (request.method === "POST" && env.HOOK_PATH && url.pathname === `/hook/${env.HOOK_PATH}`) {
      try {
        const body = await request.json();
        const message = typeof body.message === "string"
          ? body.message.slice(0, 3500)
          : `Personal Gold AI alert\\n${JSON.stringify(body).slice(0, 3000)}`;
        await sendTelegram(env, message);
        return json({ ok: true });
      } catch (error) {
        return json({ ok: false, error: error.message }, 400);
      }
    }

    return json({ ok: false, error: "Not found" }, 404);
  }
};
