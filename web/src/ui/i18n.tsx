import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'vi' | 'en';

export const translations = {
  vi: {
    // Header & Nav
    'nav.search': 'Tìm bài viết...',
    'nav.login': 'Đăng nhập',
    'nav.logout': 'Đăng xuất',
    'nav.admin': 'Admin',
    'nav.installExt': 'Tải Extension',
    'nav.donate': 'Ủng hộ',
    'nav.donateTitle': 'Ủng hộ dự án',
    'nav.google': 'Google',
    'nav.langLabel': 'Ngôn ngữ',
    'nav.themeTitle': 'Chuyển chế độ sáng / tối',
    'theme.toggleDark': 'Chuyển sang chế độ tối',
    'theme.toggleLight': 'Chuyển sang chế độ sáng',

    // Hero
    'hero.badge': 'Nhiệt Kế Cảm Xúc Threads Bằng AI',
    'hero.title': 'Đo nhiệt độ & cảm xúc thảo luận trên Threads',
    'hero.subtitle': 'Phân tích hàng trăm bình luận trong tích tắc bằng AI. Nhìn thấu sắc thái bùng nổ, tranh cãi và những góc nhìn thú vị của cộng đồng.',
    'hero.ctaExt': 'Cài đặt Chrome Extension',
    'hero.ctaExplore': 'Khám phá bài viết',
    'hero.searchPlaceholder': 'Dán link bài viết Threads hoặc tìm kiếm chủ đề...',
    'hero.searchButton': 'Phân tích',
    'hero.consoleLive': 'BẢNG NHIỆT LIVE',
    'hero.consoleUpdated': 'cập nhật theo thời gian thực',
    'hero.consoleNoData': 'Chưa có dữ liệu',
    'hero.consoleThreads': 'Bài viết',
    'hero.consoleComments': 'Bình luận',
    'hero.consolePoints': 'điểm',
    'hero.consoleLegend': 'thang nhiệt cảm xúc',

    // Marquee
    'marquee.explosive': 'Đo độ bùng nổ',
    'marquee.comments': 'Phân tích từng bình luận',
    'marquee.controversy': 'Phát hiện tranh cãi sớm',
    'marquee.community': 'Bắt nhịp cộng đồng',
    'marquee.quotes': 'Trích dẫn cảm xúc tiêu biểu',
    'marquee.ai': 'AI chấm điểm liên tục',
    'marquee.noInstall': 'Không cần cài đặt',

    // How it works / Algorithm
    'how.eyebrow': 'Thuật toán AI',
    'how.title': 'AI tính điểm & đo nhiệt độ cảm xúc như thế nào?',
    'how.subtitle': 'Quy trình 3 bước xử lý từ bóc tách bình luận đến tổng hợp chỉ số nhiệt kế trực quan.',
    'how.step1.title': 'Trích xuất ngữ cảnh & bình luận',
    'how.step1.desc': 'Chrome Extension tự động quét dữ liệu bài gốc, toàn bộ bình luận và mở rộng các phản hồi lồng nhau qua luồng GraphQL thời gian thực.',
    'how.step2.title': 'Chấm điểm Cảm xúc 0-100 với LLM',
    'how.step2.desc': 'Mỗi bình luận được đưa qua mô hình AI để đánh giá mức độ căng thẳng/tức giận từ 0 (rất tích cực/vui vẻ) đến 100 (cực kỳ gay gắt/bùng nổ) kèm lý do giải thích.',
    'how.step3.title': 'Tổng hợp Chỉ số Nhiệt độ',
    'how.step3.desc': 'Hệ thống tính toán điểm trung bình toàn bài, tỷ lệ cảm xúc và hiển thị trực quan qua đồng hồ nhiệt kế đo độ "nóng" của cuộc tranh luận.',

    // Bento stats
    'bento.eyebrow': 'Thống kê trực quan',
    'bento.title': 'ThreadScore đang đốt lò',
    'bento.subtitle': 'Dữ liệu phân tích cảm xúc cộng đồng được cập nhật liên tục.',
    'bento.totalThreads': 'Bài viết đã quét',
    'bento.totalThreadsDesc': 'Mỗi bài là một ngọn lửa được đo bằng AI.',
    'bento.totalComments': 'Bình luận được phân tích',
    'bento.avgHeat': 'Nhiệt độ trung bình',
    'bento.burstRate': 'Tỷ lệ bình luận bùng nổ',
    'bento.hottest': 'Bùng nổ nhất',
    'bento.awaiting': 'Chờ bài viết đầu tiên',
    'bento.heatScore': 'điểm tức giận',
    'bento.updated': 'dữ liệu cập nhật liên tục',
    'bento.positive': 'Bình luận tích cực',
    'bento.positiveDesc': 'Không phải lúc nào cũng nóng, vẫn có chốn bình yên.',
    'bento.viewReport': 'Xem báo cáo',

    // Community stats
    'stats.eyebrow': 'Thống Kê Trực Quan',
    'stats.title': 'Bức Tranh Nhiệt Độ Toàn Nền Tảng',
    'stats.subtitle': 'Chỉ số cảm xúc trung bình tổng hợp từ toàn bộ các bài viết và bình luận đã được AI chấm điểm.',
    'stats.communityHeat': 'nhiệt độ cộng đồng',
    'stats.noData': 'chưa có dữ liệu',
    'stats.scoredThreads': 'Bài viết đã chấm',
    'stats.analyzedComments': 'Bình luận đã phân tích',
    'stats.bang': 'Bùng nổ',
    'stats.trunglap': 'Trung lập',
    'stats.vuive': 'Vui vẻ',

    // Sorting & Feed
    'feed.title': 'Bảng nhiệt hôm nay',
    'feed.sort.hottest': 'Nóng nhất',
    'feed.sort.latest': 'Mới nhất',
    'feed.sort.comments': 'Nhiều bình luận',
    'feed.empty': 'Chưa có bài viết nào được quét.',
    'feed.emptyHint': 'Dán liên kết Threads bất kỳ vào ô tìm kiếm ở trên để gửi yêu cầu đo nhiệt độ bài viết đầu tiên!',
    'feed.error': 'Lỗi tải danh sách',

    // ThreadCard
    'tc.pending': 'Đang chờ chấm điểm',
    'tc.hot': 'Bùng nổ',
    'tc.calm': 'Vui vẻ',
    'tc.neutral': 'Trung lập',
    'tc.angry': 'Bùng nổ',
    'tc.positive': 'Vui vẻ',
    'tc.comments': 'bình luận',
    'tc.onThreads': 'Mở bài viết gốc trên Threads',
    'tc.viewReport': 'Xem chi tiết',
    'tc.heatBadge': 'Điểm nhiệt độ cảm xúc (0-100)',
    'tc.anon': 'ẩn danh',

    // SearchBox
    'sb.placeholder': 'Tìm bài viết hoặc dán link Threads...',
    'sb.search': 'Tìm',
    'sb.pending': 'Bài viết này đang được xử lý. Quay lại sau nhé.',
    'sb.unknown': 'Bài viết này chưa có trên ThreadScore.',
    'sb.found': 'Tìm thấy {n} bài viết.',
    'sb.requestSent': 'Đã gửi request. Chủ sở hữu sẽ import bài này sớm.',
    'sb.requestBtn': 'Request bài viết',
    'sb.error': 'Lỗi tìm kiếm',
    'sb.requestError': 'Lỗi gửi request',
    'sb.fallback': 'Bài viết Threads',

    // Thread detail page
    'tp.back': 'Quay lại trang chủ',
    'tp.home': 'Về trang chủ',
    'tp.loadError': 'Lỗi tải bài viết',
    'tp.postFallback': 'Bài viết Threads',
    'tp.avgLabel': 'Điểm cảm xúc tức giận trung bình:',
    'tp.topHot': 'Top Bùng nổ tiêu biểu',
    'tp.topCalm': 'Top Vui vẻ tiêu biểu',
    'tp.allComments': 'Tất cả bình luận',
    'tp.all': 'Tất cả',
    'tp.hot': 'Bùng nổ',
    'tp.neutral': 'Trung lập',
    'tp.calm': 'Vui vẻ',
    'tp.searchComments': 'Tìm trong bình luận...',
    'tp.noComments': 'Không có bình luận nào trong danh mục này',
    'tp.tryOther': 'Thử chuyển sang bộ lọc khác để xem bình luận.',
    'tp.onThreads': 'Xem trên Threads',
    'tp.commentsCount': 'bình luận',
    'tp.anon': 'ẩn danh',
    'tp.likes': 'thích',
    'tp.reason': 'Vì sao:',
    'tp.pending': 'Đang chờ chấm điểm...',
    'tp.voteCorrect': 'AI chấm đúng',
    'tp.voteWrong': 'AI chấm sai',
    'tp.trust': 'Tin cậy',
    'tp.trustTitle': 'Độ tin cậy của AI',
    'tp.voteErr': 'Không thể vote',
    'tp.discussionTitle': 'Thảo luận',
    'tp.discussionIntro': 'Chia sẻ góc nhìn của bạn về bài viết này.',
    'tp.discussionName': 'Tên hiển thị (không bắt buộc)',
    'tp.discussionNamePh': 'Ví dụ: Khách ghé thăm',
    'tp.discussionLabel': 'Bình luận của bạn',
    'tp.discussionPh': 'Nhập nhận xét hoặc góc nhìn của bạn về bài viết này...',
    'tp.discussionSend': 'Gửi bình luận',
    'tp.discussionErr': 'Không thể gửi comment',
    'tp.discussionAnon': 'Ẩn danh',

    // Hall of Fame
    'hof.eyebrow': 'Bảng Vinh Danh',
    'hof.title': 'Những Người Tiếp Lửa Cho ThreadScore',
    'hof.subtitle': 'Lời cảm ơn chân thành tới những người bạn và mạnh thường quân đã ủng hộ duy trì máy chủ & chi phí AI.',
    'hof.cta': 'Bạn muốn có tên trên Bảng Vinh Danh này?',
    'hof.ctaBtn': 'Tiếp lửa ngay',

    // CTA banner
    'cta.title': 'Đo ngay bài viết đang làm bạn tò mò',
    'cta.subtitle': 'Dán link, chờ AI chấm điểm, rồi xem cộng đồng thực sự nghĩ gì.',
    'cta.btn': 'Dán link bài viết ngay',

    // Footer
    'footer.brandDesc': 'Đo nhiệt độ cảm xúc của cộng đồng Threads bằng AI, từng bình luận, từng bài viết.',
    'footer.disclaimerTitle': 'Tuyên bố miễn trừ trách nhiệm & Pháp lý',
    'footer.disclaimer1': 'Độc lập & Phi liên kết: ThreadScore là dự án nghiên cứu và phân tích dữ liệu độc lập, không trực thuộc, không được tài trợ, ủy quyền hay xác nhận bởi Meta Platforms, Inc. hoặc Threads. Tên gọi "Threads", logo và các nhãn hiệu liên quan thuộc toàn quyền sở hữu của Meta Platforms, Inc.',
    'footer.disclaimer2': 'Phạm vi dữ liệu: Dữ liệu bài viết và bình luận được trích xuất từ các nguồn công khai phục vụ mục đích nghiên cứu xu hướng và phân tích dữ liệu mở; do cơ chế phân trang và thuật toán của bên thứ ba, dữ liệu có thể không bao quát 100% tất cả phản hồi thực tế.',
    'footer.disclaimer3': 'Đánh giá của AI: Điểm số cảm xúc và phân loại nhiệt độ được mô hình ngôn ngữ lớn (LLM) tự động tính toán chỉ mang tính chất tham khảo, thống kê xu hướng, không cấu thành kết luận khẳng định hay ý kiến chủ quan về bất kỳ cá nhân, tổ chức nào.',
    'footer.disclaimer4': 'Quyền riêng tư & Gỡ bỏ: Chúng tôi tôn trọng quyền tác giả và quyền riêng tư. Chủ sở hữu nội dung có quyền yêu cầu ẩn hoặc gỡ bỏ thông tin bài viết liên quan bất cứ lúc nào qua kênh liên hệ của QuackForge Studio.',
    'footer.privacyTitle': 'Quyền riêng tư & Gỡ bỏ:',
    'footer.privacyBody': 'Chúng tôi tôn trọng quyền tác giả và quyền riêng tư. Chủ sở hữu nội dung có quyền yêu cầu ẩn hoặc gỡ bỏ thông tin bài viết liên quan bất cứ lúc nào qua email:',
    'footer.contact': 'Liên hệ',
    'footer.donate': 'Ủng hộ tác giả',
    'footer.privacy': 'Chính sách bảo mật',
    'footer.langLabel': 'Ngôn ngữ',
    'footer.language': 'Ngôn ngữ',
    'footer.credits': 'Phát triển bởi',
  },
  en: {
    // Header & Nav
    'nav.search': 'Search threads...',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.admin': 'Admin',
    'nav.installExt': 'Get Extension',
    'nav.donate': 'Donate',
    'nav.donateTitle': 'Support Project',
    'nav.google': 'Google',
    'nav.langLabel': 'Language',
    'nav.themeTitle': 'Toggle light / dark mode',
    'theme.toggleDark': 'Switch to Dark Mode',
    'theme.toggleLight': 'Switch to Light Mode',

    // Hero
    'hero.badge': 'AI-Powered Threads Sentiment Thermometer',
    'hero.title': 'Measure sentiment & flame on Threads',
    'hero.subtitle': 'Analyze hundreds of comments in seconds with AI. Uncover outrage levels, controversy and the interesting voices inside the community.',
    'hero.ctaExt': 'Install Chrome Extension',
    'hero.ctaExplore': 'Explore Discussions',
    'hero.searchPlaceholder': 'Paste Threads link or search topics...',
    'hero.searchButton': 'Analyze',
    'hero.consoleLive': 'LIVE HEAT BOARD',
    'hero.consoleUpdated': 'updated in real time',
    'hero.consoleNoData': 'No data yet',
    'hero.consoleThreads': 'Threads',
    'hero.consoleComments': 'Comments',
    'hero.consolePoints': 'pts',
    'hero.consoleLegend': 'sentiment heat scale',

    // Marquee
    'marquee.explosive': 'Explosion scoring',
    'marquee.comments': 'Per-comment analysis',
    'marquee.controversy': 'Early controversy detection',
    'marquee.community': 'Community pulse',
    'marquee.quotes': 'Signature emotion quotes',
    'marquee.ai': 'Continuous AI scoring',
    'marquee.noInstall': 'No install needed',

    // How it works / Algorithm
    'how.eyebrow': 'AI Algorithm',
    'how.title': 'How does AI calculate heat & emotion scores?',
    'how.subtitle': 'A 3-step pipeline from comment extraction to aggregate discussion thermometer visualization.',
    'how.step1.title': 'Extract Context & Comments',
    'how.step1.desc': 'The Chrome Extension automatically captures the root post, all comments, and expands nested replies via real-time GraphQL streaming.',
    'how.step2.title': '0-100 Emotion Scoring with LLM',
    'how.step2.desc': 'Each comment is evaluated by an AI model to gauge anger/tension levels from 0 (joyful/positive) to 100 (furious/heated) with explanation reasoning.',
    'how.step3.title': 'Heat Index Aggregation',
    'how.step3.desc': 'The platform computes average thread scores, sentiment distributions, and displays a responsive visual thermometer indicating overall flame heat.',

    // Bento stats
    'bento.eyebrow': 'Live Insights',
    'bento.title': 'ThreadScore Live Furnace',
    'bento.subtitle': 'Community sentiment data updated continuously in real-time.',
    'bento.totalThreads': 'Threads Analyzed',
    'bento.totalThreadsDesc': 'Every post is a discussion measured by AI.',
    'bento.totalComments': 'Comments Processed',
    'bento.avgHeat': 'Average Heat Score',
    'bento.burstRate': 'High-Tension Ratio',
    'bento.hottest': 'Hottest Thread',
    'bento.awaiting': 'Awaiting first thread',
    'bento.heatScore': 'heat score',
    'bento.updated': 'updated in real-time',
    'bento.positive': 'Positive comments',
    'bento.positiveDesc': 'Not always fiery, calm spots still exist.',
    'bento.viewReport': 'View report',

    // Community stats
    'stats.eyebrow': 'Visual Statistics',
    'stats.title': 'Community Sentiment Landscape',
    'stats.subtitle': 'Aggregated sentiment metrics across all analyzed threads and community discussions.',
    'stats.communityHeat': 'community heat',
    'stats.noData': 'no data yet',
    'stats.scoredThreads': 'Threads scored',
    'stats.analyzedComments': 'Comments analyzed',
    'stats.bang': 'Heated',
    'stats.trunglap': 'Neutral',
    'stats.vuive': 'Positive',

    // Sorting & Feed
    'feed.title': 'Heat Board Today',
    'feed.sort.hottest': 'Hottest',
    'feed.sort.latest': 'Latest',
    'feed.sort.comments': 'Most comments',
    'feed.empty': 'No threads have been scanned yet.',
    'feed.emptyHint': 'Paste any Threads post link into the search box above to measure its sentiment temperature!',
    'feed.error': 'Failed to load feed',

    // ThreadCard
    'tc.pending': 'Pending AI Scoring',
    'tc.hot': 'Hot',
    'tc.calm': 'Calm',
    'tc.neutral': 'Neutral',
    'tc.angry': 'Angry',
    'tc.positive': 'Positive',
    'tc.comments': 'comments',
    'tc.onThreads': 'Open original post on Threads',
    'tc.viewReport': 'View report',
    'tc.heatBadge': 'Sentiment heat score (0-100)',
    'tc.anon': 'anonymous',

    // SearchBox
    'sb.placeholder': 'Search threads or paste a Threads link...',
    'sb.search': 'Search',
    'sb.pending': 'This thread is being processed. Check back soon.',
    'sb.unknown': 'This thread is not on ThreadScore yet.',
    'sb.found': 'Found {n} threads.',
    'sb.requestSent': 'Request sent. The owner will import this thread soon.',
    'sb.requestBtn': 'Request thread',
    'sb.error': 'Search error',
    'sb.requestError': 'Failed to send request',
    'sb.fallback': 'Threads Post',

    // Thread detail page
    'tp.back': 'Back to Home',
    'tp.home': 'Back to home',
    'tp.loadError': 'Failed to load thread',
    'tp.postFallback': 'Threads Post',
    'tp.avgLabel': 'Average anger score:',
    'tp.topHot': 'Top Heated',
    'tp.topCalm': 'Top Positive',
    'tp.allComments': 'All comments',
    'tp.all': 'All',
    'tp.hot': 'Heated',
    'tp.neutral': 'Neutral',
    'tp.calm': 'Positive',
    'tp.searchComments': 'Search comments...',
    'tp.noComments': 'No comments in this category',
    'tp.tryOther': 'Try another filter to browse comments.',
    'tp.onThreads': 'View on Threads',
    'tp.commentsCount': 'comments',
    'tp.anon': 'anonymous',
    'tp.likes': 'likes',
    'tp.reason': 'Why:',
    'tp.pending': 'Pending AI scoring...',
    'tp.voteCorrect': 'AI correct',
    'tp.voteWrong': 'AI wrong',
    'tp.trust': 'Trust',
    'tp.trustTitle': 'AI trust score',
    'tp.voteErr': 'Vote failed',
    'tp.discussionTitle': 'Discussion',
    'tp.discussionIntro': 'Share your perspective on this thread.',
    'tp.discussionName': 'Display name (optional)',
    'tp.discussionNamePh': 'e.g. Guest',
    'tp.discussionLabel': 'Your comment',
    'tp.discussionPh': 'Share your take on this thread...',
    'tp.discussionSend': 'Post comment',
    'tp.discussionErr': 'Failed to post comment',
    'tp.discussionAnon': 'Anonymous',

    // Hall of Fame
    'hof.eyebrow': 'Hall of Fame',
    'hof.title': 'ThreadScore Flame Keepers',
    'hof.subtitle': 'Heartfelt thanks to the wonderful supporters keeping our servers and AI models running.',
    'hof.cta': 'Want your name featured on the Flame Keepers wall?',
    'hof.ctaBtn': 'Support the project',

    // CTA banner
    'cta.title': 'Analyze the threads you are curious about',
    'cta.subtitle': 'Paste a link, let AI score the sentiment, and see what the community truly feels.',
    'cta.btn': 'Paste thread link now',

    // Footer
    'footer.brandDesc': 'Measuring the emotional temperature of Threads communities with AI, comment by comment, post by post.',
    'footer.disclaimerTitle': 'Disclaimer & Legal Notice',
    'footer.disclaimer1': 'Non-Affiliation: ThreadScore is an independent data research project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Meta Platforms, Inc. or Threads. "Threads", logos, and related marks are trademarks of Meta Platforms, Inc.',
    'footer.disclaimer2': 'Data Scope: Post and comment data are extracted from publicly accessible web pages for academic and open trend research purposes; due to platform pagination and third-party limits, scraped datasets may not capture 100% of all real-world replies.',
    'footer.disclaimer3': 'AI Analysis: Sentiment scores (0-100) and heat metrics are generated by automated Large Language Models for statistical and observational reference only, and do not constitute factual assertions or endorsements.',
    'footer.disclaimer4': 'Privacy & Takedowns: We respect creator privacy and copyright. Content owners may request removal or masking of their related thread data at any time by contacting QuackForge Studio.',
    'footer.privacyTitle': 'Privacy & Takedowns:',
    'footer.privacyBody': 'We respect creator privacy and copyright. Content owners may request removal or masking of related thread data at any time via email:',
    'footer.contact': 'Contact',
    'footer.donate': 'Support Developer',
    'footer.privacy': 'Privacy Policy',
    'footer.langLabel': 'Language',
    'footer.language': 'Language',
    'footer.credits': 'Powered by',
  },
} as const;

export type TranslationKey = keyof typeof translations['vi'];

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tf: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (k) => translations.vi[k] || k,
  tf: (k) => translations.vi[k] || k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'vi';
    const stored = localStorage.getItem('ts_lang') as Language | null;
    if (stored === 'vi' || stored === 'en') return stored;
    return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  });

  const setLang = (next: Language) => {
    setLangState(next);
    localStorage.setItem('ts_lang', next);
    document.documentElement.lang = next;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations.vi[key] || key;
  };

  const tf = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    let s = t(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  };

  return <I18nContext.Provider value={{ lang, setLang, t, tf }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
