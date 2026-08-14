// CORS + security headers cho toàn bộ API (extension gọi từ origin khác)
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const res = new Response(response.body, response);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: res.headers });
  }
  return res;
};
