// Content Script chạy trong MAIN world (vượt CSP). Bắt response GraphQL/API của Threads
// để lấy comment đầy đủ (like_count, posted_at, external_id, author_name) + comment con (replies).
//
// Lưu ý quan trọng: Threads web mới bọc comment trong wrapper `post`:
//   { post: { caption: { text }, user: { username, full_name }, like_count, taken_at, id } }
// → phải xử lý cả object lồng `post`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

interface RawComment {
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
  parent_id: string | null; // id của comment cha — khác null tức là reply con
  reply_to_username: string | null;
  pageUrl: string | null; // URL trang đang mở khi bắt được — để lọc tránh trộn bài
}

(function () {
  if (typeof window === 'undefined' || (window as unknown as { __ts_interceptor_injected?: boolean }).__ts_interceptor_injected) return;
  (window as unknown as { __ts_interceptor_injected: boolean }).__ts_interceptor_injected = true;

  // Lấy object "post" bên trong nếu có (wrapper của Threads)
  function unwrapPost(obj: AnyObj): AnyObj {
    if (obj.post && typeof obj.post === 'object' && (obj.post.caption || obj.post.user || obj.post.text)) {
      return obj.post;
    }
    return obj;
  }

  // Trích xuất một comment từ object (đã unwrap post)
  function extractComment(obj: AnyObj, out: RawComment[]) {
    if (!obj || typeof obj !== 'object') return;

    // Xử lý wrapper post
    const node = unwrapPost(obj);

    const text =
      node.text ||
      (node.caption && (typeof node.caption === 'string' ? node.caption : node.caption.text)) ||
      (typeof node.body === 'string' ? node.body : null);
    const user = node.user || node.owner || node.author;
    if (typeof text === 'string' && text.trim().length > 0 && user && typeof user === 'object') {
      const username = user.username || user.handle || null;
      const fullName = user.full_name || user.name || null;
      if (username) {
        const likes =
          typeof node.like_count === 'number' ? node.like_count :
          typeof node.comment_like_count === 'number' ? node.comment_like_count : 0;
        const takenAt =
          typeof node.taken_at === 'number' ? node.taken_at :
          typeof node.created_at === 'number' ? node.created_at : null;
        const pk = node.id || node.pk || null;

        const textPostInfo = node.text_post_app_info || {};
        const parentPk =
          typeof node.parent_id === 'string' || typeof node.parent_id === 'number' ? String(node.parent_id) :
          node.parent && (node.parent.id || node.parent.pk) ? String(node.parent.id || node.parent.pk) :
          node.comment_parent_id ? String(node.comment_parent_id) :
          textPostInfo.parent_post_id ? String(textPostInfo.parent_post_id) : null;

        const replyToUser =
          (node.reply_to_username ? String(node.reply_to_username) : null) ||
          (textPostInfo.reply_to_author?.username ? String(textPostInfo.reply_to_author.username) : null) ||
          (node.parent && (node.parent.user?.username || node.parent.user?.handle) ? String(node.parent.user?.username || node.parent.user?.handle) : null);

        out.push({
          external_id: pk ? String(pk) : null,
          author_username: String(username),
          author_name: fullName ? String(fullName) : null,
          text: text.trim(),
          like_count: likes,
          posted_at: takenAt,
          parent_id: parentPk,
          reply_to_username: replyToUser,
          pageUrl: window.location.href,
        });
      }
    }

    // Đệ quy toàn diện: duyệt qua tất cả key và array (thread_items, reply_threads, sub_threads, nodes, edges)
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const val = obj[key];
      if (!val || typeof val !== 'object') continue;
      if (Array.isArray(val)) {
        for (const item of val) extractComment(item, out);
      } else {
        extractComment(val, out);
      }
    }
  }

  // Debug: thống kê tổng hợp số response/comment bắt được
  const dbg = {
    fetchSeen: 0,
    xhrSeen: 0,
    scriptSeen: 0,
    graphQLResponses: 0,
    totalComments: 0,
    totalReplies: 0,
  };

  function logDebug(tag: string, msg: string) {
    try {
      console.log(`[TS-DEBUG] [${tag}] ${msg}`);
    } catch {}
  }

  // Giải mã chuỗi JSON từ Meta (xử lý prefix `for (;;);` và stream chunk)
  function parseJsonPayloads(text: string): AnyObj[] {
    if (!text || typeof text !== 'string') return [];
    const clean = text.replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
    if (!clean) return [];

    try {
      const parsed = JSON.parse(clean);
      return [parsed];
    } catch {
      const results: AnyObj[] = [];
      const lines = clean.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
        if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) continue;
        try {
          results.push(JSON.parse(trimmed));
        } catch {}
      }
      return results;
    }
  }

  function handleResponseData(url: string, textData: string, source: 'fetch' | 'xhr' | 'script') {
    if (source !== 'script' && (!url || (!url.includes('graphql') && !url.includes('api/v1')))) return;
    if (source === 'fetch') dbg.fetchSeen++;
    else if (source === 'xhr') dbg.xhrSeen++;
    else dbg.scriptSeen++;
    dbg.graphQLResponses++;
    logDebug('response', `${source} → ${url.slice(0, 120)}`);

    try {
      const payloads = parseJsonPayloads(textData);
      if (payloads.length === 0) return;

      const comments: RawComment[] = [];
      for (const data of payloads) {
        extractComment(data, comments);
      }

      // Lọc trùng lặp theo external_id/text
      const seen = new Set<string>();
      const filtered = comments.filter((c) => {
        const key = c.external_id || `${c.author_username}:${c.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      dbg.totalComments += filtered.length;
      dbg.totalReplies += filtered.filter((c) => c.parent_id != null).length;
      logDebug(
        'extract',
        `comments=${filtered.length} (replies=${filtered.filter((c) => c.parent_id != null).length}), total=${dbg.totalComments}`
      );

      if (filtered.length > 0) {
        window.postMessage(
          {
            type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
            comments: filtered,
            pageUrl: window.location.href,
          },
          '*'
        );
      }
    } catch {
      // ignore parsing error
    }
  }

  // Quét các thẻ script JSON hydration trên trang
  function scanScriptTags() {
    if (typeof document === 'undefined') return;
    const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[data-sjs]'));
    for (const s of scripts) {
      if ((s as HTMLElement).dataset?.tsScanned === 'true') continue;
      (s as HTMLElement).dataset.tsScanned = 'true';
      const txt = s.textContent?.trim();
      if (!txt || txt.length < 30) continue;
      if (txt.includes('username') || txt.includes('caption') || txt.includes('thread_items') || txt.includes('text_post_app_info')) {
        handleResponseData('inline-script', txt, 'script');
      }
    }
  }

  // Hook window.fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await origFetch.apply(this, args);
    try {
      const clone = response.clone();
      const url = response.url || (args[0] && (args[0] as Request).url) || String(args[0]);
      clone.text().then((txt) => handleResponseData(url, txt, 'fetch')).catch(() => {});
    } catch {}
    return response;
  };

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    (this as unknown as { __ts_url: string }).__ts_url = String(url);
    return origOpen.apply(this, [method, url, ...rest] as never);
  };

  XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    this.addEventListener('load', function () {
      try {
        handleResponseData((this as unknown as { __ts_url: string }).__ts_url, this.responseText, 'xhr');
      } catch {}
    });
    return origSend.apply(this, args as never);
  };

  // Quét script ngay khi sẵn sàng & quan sát DOM thay đổi
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => scanScriptTags());
    } else {
      scanScriptTags();
    }
    try {
      const observer = new MutationObserver(() => scanScriptTags());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch {}
  }

  logDebug('init', `Interceptor sẵn sàng. Fetch thấy: ${dbg.fetchSeen}, XHR thấy: ${dbg.xhrSeen}, GraphQL responses: ${dbg.graphQLResponses}`);
})();
