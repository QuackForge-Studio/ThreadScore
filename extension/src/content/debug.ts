// Bộ đếm debug dùng chung giữa scraper, autoScroll và popup.
// Tách riêng file để tránh circular import (scraper ↔ autoScroll).
export interface DebugStats {
  bufferSize: number;
  bufferedWithReplies: number; // comment trong buffer có parent_id (là reply con)
  graphQLComments: number; // số comment lấy được từ buffer (sau lọc bài/trùng)
  domComments: number; // số comment bổ sung từ DOM
  expandersFound: number; // số nút "N câu trả lời" tìm thấy trên trang
  expandersClicked: number; // số nút đã click được
  repliesCounted: number; // số phần tử DOM trông như reply (countReplies)
  interceptedMessages: number; // số message postMessage nhận được từ interceptor
  totalInterceptedRaw: number; // tổng comment thô interceptor gửi lên
  lastInterceptUrl: string | null; // URL của message interceptor cuối
  totalAuthorLinks: number; // tổng số a[href*="/@"] trên trang
  skippedSidebar: number; // bị bỏ vì nằm trong sidebar/header/nav
  skippedAboveMain: number; // bị bỏ vì nằm phía trên bài chính
  skippedInMain: number; // bị bỏ vì nằm trong mainPostContainer
  skippedNoCard: number; // bị bỏ vì không tìm được card
  skippedNoText: number; // bị bỏ vì không có text comment
  skippedMainText: number; // bị bỏ vì text trùng title/content bài chính
  skippedDup: number; // bị bỏ vì trùng lặp
  mainPostContainerTag: string; // tag của mainPostContainer (để biết nó bao cả comments hay không)
}

export const debugStats: DebugStats = {
  bufferSize: 0,
  bufferedWithReplies: 0,
  graphQLComments: 0,
  domComments: 0,
  expandersFound: 0,
  expandersClicked: 0,
  repliesCounted: 0,
  interceptedMessages: 0,
  totalInterceptedRaw: 0,
  lastInterceptUrl: null,
  totalAuthorLinks: 0,
  skippedSidebar: 0,
  skippedAboveMain: 0,
  skippedInMain: 0,
  skippedNoCard: 0,
  skippedNoText: 0,
  skippedMainText: 0,
  skippedDup: 0,
  mainPostContainerTag: '',
};
