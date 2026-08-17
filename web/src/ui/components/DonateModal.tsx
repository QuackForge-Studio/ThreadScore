import { useState } from 'react';
import { Coffee, Heart, X, Copy, Check, QrCode } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MESSAGES = {
  vi: {
    title: 'Ủng hộ ThreadScore',
    subtitle: 'Giúp chúng tôi duy trì máy chủ & chi phí token AI',
    qrCaption: 'Quét mã VietQR (Mọi app ngân hàng / Momo)',
    bank: 'Ngân hàng',
    bankName: 'MB Bank (Quân Đội)',
    account: 'Số tài khoản / SĐT',
    owner: 'Chủ tài khoản',
    memo: 'Nội dung',
    thanks: 'Mọi sự ủng hộ của bạn là động lực to lớn giúp QuackForge Studio tiếp tục phát triển các công cụ mở miễn phí.',
    copied: 'Đã copy',
    copy: 'Copy',
  },
  en: {
    title: 'Support ThreadScore',
    subtitle: 'Help us cover server & AI LLM token costs',
    qrCaption: 'Scan with Banking App / Momo',
    bank: 'Bank',
    bankName: 'MB Bank (Military)',
    account: 'Account Number',
    owner: 'Account Name',
    memo: 'Memo',
    thanks: 'Every contribution empowers QuackForge Studio to keep building and maintaining free open-source tools.',
    copied: 'Copied',
    copy: 'Copy',
  },
} as const;

export default function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const { lang } = useI18n();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const m = MESSAGES[lang];

  if (!isOpen) return null;

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={m.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Coffee size={20} weight="fill" color="var(--accent)" />
            </div>
            <div>
              <h3>{m.title}</h3>
              <p className="modal-subtitle">{m.subtitle}</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <div className="donate-box">
            <div className="donate-qr-wrapper">
              {/* VietQR MB Bank */}
              <img
                src="https://img.vietqr.io/image/MB-0943505127-compact2.png?amount=0&addInfo=ThreadScore%20Donate&accountName=LUONG%20DUY%20KHANG"
                alt="VietQR Donate"
                className="donate-qr-img"
              />
              <span className="donate-qr-caption">
                <QrCode size={14} /> {m.qrCaption}
              </span>
            </div>

            <div className="donate-info-list">
              <div className="donate-info-item">
                <span className="donate-label">{m.bank}</span>
                <span className="donate-val">{m.bankName}</span>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{m.account}</span>
                <div className="donate-val-row">
                  <span className="donate-val mono">0943505127</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyToClipboard('0943505127', 'stk')}
                    title={m.copy}
                  >
                    {copiedField === 'stk' ? <Check size={14} color="var(--calm-ink)" /> : <Copy size={14} />}
                    {copiedField === 'stk' ? m.copied : m.copy}
                  </button>
                </div>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{m.owner}</span>
                <span className="donate-val">LUONG DUY KHANG</span>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{m.memo}</span>
                <span className="donate-val mono">ThreadScore Donate</span>
              </div>
            </div>
          </div>

          <p className="donate-thanks">
            <Heart size={14} weight="fill" color="var(--accent)" /> {m.thanks}
          </p>
        </div>
      </div>
    </div>
  );
}
