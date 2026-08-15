// Content Script running natively in MAIN world (bypasses CSP inline script restrictions)
(function () {
  if (typeof window === 'undefined' || (window as any).__ts_interceptor_injected) return;
  (window as any).__ts_interceptor_injected = true;

  function parseCommentsFromJSON(obj: any, comments: any[]) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) parseCommentsFromJSON(item, comments);
      return;
    }

    const text = obj.text || (obj.caption && obj.caption.text) || (obj.post && obj.post.caption && obj.post.caption.text);
    const user = obj.user || (obj.post && obj.post.user);
    const username = user ? (user.username || user.handle) : null;
    const pk = obj.pk || obj.id || (obj.post && (obj.post.pk || obj.post.id));

    if (text && typeof text === 'string' && text.trim().length > 0 && username) {
      const likes = typeof obj.like_count === 'number' ? obj.like_count : 0;
      const takenAt = typeof obj.taken_at === 'number' ? obj.taken_at : null;

      comments.push({
        external_id: pk ? String(pk) : null,
        author_username: String(username),
        text: text.trim(),
        like_count: likes,
        posted_at: takenAt,
      });
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] && typeof obj[key] === 'object') {
        parseCommentsFromJSON(obj[key], comments);
      }
    }
  }

  function handleResponseData(url: string, textData: string) {
    if (!url || (!url.includes('graphql') && !url.includes('api/v1'))) return;
    try {
      const data = JSON.parse(textData);
      const comments: any[] = [];
      parseCommentsFromJSON(data, comments);

      if (comments.length > 0) {
        window.postMessage(
          {
            type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
            comments,
          },
          '*'
        );
      }
    } catch {
      // ignore non-json
    }
  }

  // Hook window.fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    try {
      const clone = response.clone();
      const url = response.url || (args[0] && (args[0] as any).url) || String(args[0]);
      clone.text().then((txt) => handleResponseData(url, txt)).catch(() => {});
    } catch {}
    return response;
  };

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as any).__ts_url = String(url);
    return origOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function (...args: any[]) {
    this.addEventListener('load', function () {
      try {
        handleResponseData((this as any).__ts_url, this.responseText);
      } catch {}
    });
    return origSend.apply(this, args);
  };
})();
