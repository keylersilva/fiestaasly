exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { chatId, text } = JSON.parse(event.body || '{}');

  if (!chatId || !text) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'chatId and text are required' }) };
  }

  const openwaUrl = process.env.OPENWA_URL;

  if (!openwaUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENWA_URL not configured' }) };
  }

  try {
    const response = await fetch(openwaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, text }),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: response.ok }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
