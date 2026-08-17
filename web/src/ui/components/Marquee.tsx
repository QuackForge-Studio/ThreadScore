import { Fire, ChatCircle, Warning, Heart, Quotes, Smiley, MaskHappy } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

export default function Marquee() {
  const { t } = useI18n();
  const ITEMS = [
    { icon: Fire, text: t('marquee.explosive') },
    { icon: ChatCircle, text: t('marquee.comments') },
    { icon: Warning, text: t('marquee.controversy') },
    { icon: Heart, text: t('marquee.community') },
    { icon: Quotes, text: t('marquee.quotes') },
    { icon: Smiley, text: t('marquee.ai') },
    { icon: MaskHappy, text: t('marquee.noInstall') },
  ];
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
