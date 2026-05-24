import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { defineString } from 'firebase-functions/params';

initializeApp();

const openwaUrl = defineString('OPENWA_URL');

export const sendWhatsApp = onRequest(
  {
    cors: true,
    maxInstances: 1,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { chatId, text } = req.body;

    if (!chatId || !text) {
      res.status(400).json({ error: 'chatId and text are required' });
      return;
    }

    try {
      const response = await fetch(openwaUrl.value(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text }),
      });

      const data = await response.text();
      res.status(response.ok ? 200 : 502).json({
        success: response.ok,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data,
      });
    } catch (err) {
      res.status(502).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  }
);
