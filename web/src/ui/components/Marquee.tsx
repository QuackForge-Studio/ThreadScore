import { Fire, ChatCircle, Warning, Heart, Quotes, Smiley, MaskHappy } from '@phosphor-icons/react';

const ITEMS = [
  { icon: Fire, text: 'Đo độ bùng nổ' },
  { icon: ChatCircle, text: 'Phân tích từng bình luận' },
  { icon: Warning, text: 'Phát hiện tranh cãi sớm' },
  { icon: Heart, text: 'Bắt nhịp cộng đồng' },
  { icon: Quotes, text: 'Trích dẫn cảm xúc tiêu biểu' },
  { icon: Smiley, text: 'AI chấm điểm liên tục' },
  { icon: MaskHappy, text: 'Không cần cài đặt' },
];

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="marquee-item">
            <item.icon weight="fill" aria-hidden="true" />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
