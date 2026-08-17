// CORS + security headers cho toàn bộ /api/* routes
export const onRequest: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin') || '*';

  // Xử lý OPTIONS Preflight ngay lập tức mà không gọi context.next()
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  try {
    const response = await context.next();
    const res = new Response(response.body, response);
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', '*');
    res.headers.set('Access-Control-Max-Age', '86400');
    res.headers.set('Vary', 'Origin');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Vary': 'Origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
};
