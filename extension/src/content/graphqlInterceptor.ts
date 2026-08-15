// Content Script Module: Injected GraphQL Response Interceptor
// Hook vào window.fetch & XMLHttpRequest để chặn dữ liệu JSON nguyên bản từ GraphQL API của Threads.

export function initGraphQLInterceptor(): void {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.id = 'ts-graphql-interceptor-script';
  script.textContent = `
    (function() {
      if (window.__ts_interceptor_injected) return;
      window.__ts_interceptor_injected = true;

      function parseCommentsFromJSON(obj, comments) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          for (var item of obj) parseCommentsFromJSON(item, comments);
          return;
        }

        // Kiểm tra node có cấu trúc bình luận/post Threads hay không
        var text = obj.text || (obj.caption && obj.caption.text) || (obj.post && obj.post.caption && obj.post.caption.text);
        var user = obj.user || (obj.post && obj.post.user);
        var username = user ? (user.username || user.handle) : null;
        var pk = obj.pk || obj.id || (obj.post && (obj.post.pk || obj.post.id));

        if (text && typeof text === 'string' && text.trim().length > 0 && username) {
          var likes = typeof obj.like_count === 'number' ? obj.like_count : 0;
          var takenAt = typeof obj.taken_at === 'number' ? obj.taken_at : null;

          comments.push({
            external_id: pk ? String(pk) : null,
            author_username: String(username),
            text: text.trim(),
            like_count: likes,
            posted_at: takenAt,
          });
        }

        // Duyệt đệ quy tìm các node con (reply_threads, thread_items, replies, v.v.)
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key]) {
            if (typeof obj[key] === 'object') {
              parseCommentsFromJSON(obj[key], comments);
            }
          }
        }
      }

      function handleResponseData(url, textData) {
        if (!url || (!url.includes('graphql') && !url.includes('api/v1'))) return;
        try {
          var data = JSON.parse(textData);
          var comments = [];
          parseCommentsFromJSON(data, comments);

          if (comments.length > 0) {
            window.postMessage({
              type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
              comments: comments
            }, '*');
          }
        } catch (e) {
          // ignore parse errors for non-json
        }
      }

      // 1. Hook window.fetch
      var origFetch = window.fetch;
      window.fetch = async function() {
        var response = await origFetch.apply(this, arguments);
        try {
          var clone = response.clone();
          var url = response.url || (arguments[0] && arguments[0].url) || String(arguments[0]);
          clone.text().then(function(txt) {
            handleResponseData(url, txt);
          }).catch(function() {});
        } catch (e) {}
        return response;
      };

      // 2. Hook XMLHttpRequest
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url) {
        this.__ts_url = url;
        return origOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
          try {
            handleResponseData(this.__ts_url, this.responseText);
          } catch (e) {}
        });
        return origSend.apply(this, arguments);
      };
    })();
  `;

  (document.head || document.documentElement).appendChild(script);
}
