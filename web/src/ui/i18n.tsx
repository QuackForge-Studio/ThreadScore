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
    'theme.toggleDark': 'Chuyển sang chế độ tối',
    'theme.toggleLight': 'Chuyển sang chế độ sáng',

    // Hero
    'hero.badge': 'Nhiệt Kế Cảm Xúc Threads Bằng AI',
    'hero.title': 'Bắt mạch cảm xúc cộng đồng Threads.',
    'hero.subtitle': 'Phân tích & chấm điểm cảm xúc từng bình luận, đo lường chỉ số nóng lạnh của các cuộc thảo luận trên Threads với AI.',
    'hero.ctaExt': 'Cài đặt Chrome Extension',
    'hero.ctaExplore': 'Khám phá bài viết',
    'hero.searchPlaceholder': 'Dán link bài viết Threads hoặc tìm kiếm chủ đề...',
    'hero.searchButton': 'Phân tích',

    // Marquee
    'marquee.aiScoring': 'Chấm điểm cảm xúc AI 0–100',
    'marquee.autoExtension': 'Extension tự động bóc tách bình luận',
    'marquee.realtimeHeat': 'Bản đồ nhiệt độ thảo luận trực quan',
    'marquee.sentiment': 'Phân loại Bùng Nổ · Trung Lập · Vui Vẻ',

    // How it works / Algorithm
    'how.eyebrow': 'Thuật toán AI',
    'how.title': 'AI tính điểm & đo nhiệt độ cảm xúc như thế nào?',
    'how.subtitle': 'Quy trình 3 bước xử lý từ bóc tách bình luận đến tổng hợp chỉ số nhiệt kế trực quan.',
    'how.step1.title': '1. Trích xuất ngữ cảnh & bình luận',
    'how.step1.desc': 'Chrome Extension tự động quét dữ liệu bài gốc, toàn bộ bình luận và mở rộng các phản hồi lồng nhau qua luồng GraphQL thời gian thực.',
    'how.step2.title': '2. Chấm điểm Cảm xúc 0–100 với LLM',
    'how.step2.desc': 'Mỗi bình luận được đưa qua mô hình AI để đánh giá mức độ căng thẳng/tức giận từ 0 (rất tích cực/vui vẻ) đến 100 (cực kỳ gay gắt/bùng nổ) kèm lý do giải thích.',
    'how.step3.title': '3. Tổng hợp Chỉ số Nhiệt độ',
    'how.step3.desc': 'Hệ thống tính toán điểm trung bình toàn bài, tỷ lệ cảm xúc và hiển thị trực quan qua đồng hồ nhiệt kế đo độ "nóng" của cuộc tranh luận.',

    // Bento stats
    'bento.eyebrow': 'Thống kê trực quan',
    'bento.title': 'ThreadScore đang đốt lò',
    'bento.subtitle': 'Dữ liệu phân tích cảm xúc cộng đồng được cập nhật liên tục.',
    'bento.totalThreads': 'Bài viết đã quét',
    'bento.totalComments': 'Bình luận được phân tích',
    'bento.avgHeat': 'Nhiệt độ trung bình',
    'bento.burstRate': 'Tỷ lệ bình luận bùng nổ',

    // Sorting & Feed
    'feed.title': 'Các bài viết đang thảo luận',
    'feed.sort.hottest': '🔥 Nóng nhất',
    'feed.sort.latest': '⚡ Mới nhất',
    'feed.sort.calmest': '🍃 Yên ả nhất',
    'feed.empty': 'Chưa có bài viết nào được quét.',

    // Thread detail page
    'thread.author': 'Tác giả',
    'thread.published': 'Đăng lúc',
    'thread.commentsAnalyzed': 'bình luận đã phân tích',
    'thread.heatIndex': 'Chỉ số nhiệt độ bài viết',
    'thread.sentimentBreakdown': 'Phân bổ cảm xúc',
    'thread.filter.all': 'Tất cả',
    'thread.filter.anger': '🔥 Bùng nổ',
    'thread.filter.neutral': '⚖️ Trung lập',
    'thread.filter.calm': '🌿 Vui vẻ',
    'thread.viewOnThreads': 'Xem trên Threads',
    'thread.scoreReason': 'Lý do AI đánh giá:',
    'thread.communityVote': 'Bạn đồng ý với điểm số này?',
    'thread.voteAgree': 'Đồng ý',
    'thread.voteDisagree': 'Không đồng ý',

    // Footer
    'footer.brandDesc': 'Đo nhiệt độ cảm xúc của cộng đồng Threads bằng AI — từng bình luận, từng bài viết.',
    'footer.disclaimerTitle': 'Tuyên bố miễn trừ trách nhiệm & Pháp lý',
    'footer.disclaimer1': 'Độc lập & Phi liên kết: ThreadScore là dự án nghiên cứu và phân tích dữ liệu độc lập, không trực thuộc, không được tài trợ, ủy quyền hay xác nhận bởi Meta Platforms, Inc. hoặc Threads. Tên gọi "Threads", logo và các nhãn hiệu liên quan thuộc toàn quyền sở hữu của Meta Platforms, Inc.',
    'footer.disclaimer2': 'Phạm vi dữ liệu: Dữ liệu bài viết và bình luận được trích xuất từ các nguồn công khai phục vụ mục đích nghiên cứu xu hướng và phân tích dữ liệu mở; do cơ chế phân trang và thuật toán của bên thứ ba, dữ liệu có thể không bao quát 100% tất cả phản hồi thực tế.',
    'footer.disclaimer3': 'Đánh giá của AI: Điểm số cảm xúc và phân loại nhiệt độ được mô hình ngôn ngữ lớn (LLM) tự động tính toán chỉ mang tính chất tham khảo, thống kê xu hướng, không cấu thành kết luận khẳng định hay ý kiến chủ quan về bất kỳ cá nhân, tổ chức nào.',
    'footer.disclaimer4': 'Quyền riêng tư & Gỡ bỏ: Chúng tôi tôn trọng quyền tác giả và quyền riêng tư. Chủ sở hữu nội dung có quyền yêu cầu ẩn hoặc gỡ bỏ thông tin bài viết liên quan bất cứ lúc nào qua kênh liên hệ của QuackForge Studio.',
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
    'theme.toggleDark': 'Switch to Dark Mode',
    'theme.toggleLight': 'Switch to Light Mode',

    // Hero
    'hero.badge': 'AI-Powered Threads Sentiment Thermometer',
    'hero.title': 'Pulse the emotions of the Threads community.',
    'hero.subtitle': 'Analyze and score sentiment for every comment, measuring discussion heat and tension across Threads with AI.',
    'hero.ctaExt': 'Install Chrome Extension',
    'hero.ctaExplore': 'Explore Discussions',
    'hero.searchPlaceholder': 'Paste Threads link or search topics...',
    'hero.searchButton': 'Analyze',

    // Marquee
    'marquee.aiScoring': 'AI Emotion Scoring 0–100',
    'marquee.autoExtension': 'Automatic Extension Comment Scraper',
    'marquee.realtimeHeat': 'Real-time Discussion Heat Thermometer',
    'marquee.sentiment': 'Classification: Angry · Neutral · Positive',

    // How it works / Algorithm
    'how.eyebrow': 'AI Algorithm',
    'how.title': 'How does AI calculate heat & emotion scores?',
    'how.subtitle': 'A 3-step pipeline from comment extraction to aggregate discussion thermometer visualization.',
    'how.step1.title': '1. Extract Context & Comments',
    'how.step1.desc': 'The Chrome Extension automatically captures the root post, all comments, and expands nested replies via real-time GraphQL streaming.',
    'how.step2.title': '2. 0–100 Emotion Scoring with LLM',
    'how.step2.desc': 'Each comment is evaluated by an AI model to gauge anger/tension levels from 0 (joyful/positive) to 100 (furious/heated) with explanation reasoning.',
    'how.step3.title': '3. Heat Index Aggregation',
    'how.step3.desc': 'The platform computes average thread scores, sentiment distributions, and displays a responsive visual thermometer indicating overall flame heat.',

    // Bento stats
    'bento.eyebrow': 'Live Insights',
    'bento.title': 'ThreadScore Live Furnace',
    'bento.subtitle': 'Community sentiment data updated continuously in real-time.',
    'bento.totalThreads': 'Threads Analyzed',
    'bento.totalComments': 'Comments Processed',
    'bento.avgHeat': 'Average Heat Score',
    'bento.burstRate': 'High-Tension Ratio',

    // Sorting & Feed
    'feed.title': 'Trending Discussions',
    'feed.sort.hottest': '🔥 Hottest',
    'feed.sort.latest': '⚡ Latest',
    'feed.sort.calmest': '🍃 Calmest',
    'feed.empty': 'No threads have been scanned yet.',

    // Thread detail page
    'thread.author': 'Author',
    'thread.published': 'Published at',
    'thread.commentsAnalyzed': 'comments analyzed',
    'thread.heatIndex': 'Thread Heat Index',
    'thread.sentimentBreakdown': 'Sentiment Breakdown',
    'thread.filter.all': 'All',
    'thread.filter.anger': '🔥 Heated',
    'thread.filter.neutral': '⚖️ Neutral',
    'thread.filter.calm': '🌿 Positive',
    'thread.viewOnThreads': 'View on Threads',
    'thread.scoreReason': 'AI Evaluation Reasoning:',
    'thread.communityVote': 'Do you agree with this score?',
    'thread.voteAgree': 'Agree',
    'thread.voteDisagree': 'Disagree',

    // Footer
    'footer.brandDesc': 'Measuring the emotional temperature of Threads communities with AI — comment by comment, post by post.',
    'footer.disclaimerTitle': 'Disclaimer & Legal Notice',
    'footer.disclaimer1': 'Non-Affiliation: ThreadScore is an independent data research project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Meta Platforms, Inc. or Threads. "Threads", logos, and related marks are trademarks of Meta Platforms, Inc.',
    'footer.disclaimer2': 'Data Scope: Post and comment data are extracted from publicly accessible web pages for academic and open trend research purposes; due to platform pagination and third-party limits, scraped datasets may not capture 100% of all real-world replies.',
    'footer.disclaimer3': 'AI Analysis: Sentiment scores (0–100) and heat metrics are generated by automated Large Language Models for statistical and observational reference only, and do not constitute factual assertions or endorsements.',
    'footer.disclaimer4': 'Privacy & Takedowns: We respect creator privacy and copyright. Content owners may request removal or masking of their related thread data at any time by contacting QuackForge Studio.',
    'footer.language': 'Language',
    'footer.credits': 'Powered by',
  },
} as const;

export type TranslationKey = keyof typeof translations['vi'];

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (k) => translations.vi[k] || k,
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

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
