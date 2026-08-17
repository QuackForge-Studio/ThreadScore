import { useState } from 'react';
import { Coffee, Heart, X, Copy, Check, QrCode } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const { lang } = useI18n();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Coffee size={20} weight="fill" color="var(--accent)" />
            </div>
            <div>
              <h3>{lang === 'vi' ? 'Ủng hộ ThreadScore' : 'Support ThreadScore'}</h3>
              <p className="modal-subtitle">
                {lang === 'vi'
                  ? 'Giúp chúng tôi duy trì máy chủ & chi phí token AI'
                  : 'Help us cover server & AI LLM token costs'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <div className="donate-box">
            <div className="donate-qr-wrapper">
              {/* VietQR Quick Image Generator */}
              <img
                src="https://img.vietqr.io/image/MB-0348731110-compact2.png?amount=0&addInfo=ThreadScore%20Donate&accountName=LUONG%20DUY%20KHANG"
                alt="VietQR Donate"
                className="donate-qr-img"
              />
              <span className="donate-qr-caption">
                <QrCode size={14} /> {lang === 'vi' ? 'Quét mã VietQR (Mọi app ngân hàng / Momo)' : 'Scan with Banking App / Momo'}
              </span>
            </div>

            <div className="donate-info-list">
              <div className="donate-info-item">
                <span className="donate-label">{lang === 'vi' ? 'Ngân hàng' : 'Bank'}</span>
                <span className="donate-val">MB Bank (Quân Đội)</span>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{lang === 'vi' ? 'Số tài khoản' : 'Account Number'}</span>
                <div className="donate-val-row">
                  <span className="donate-val mono">0348731110</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyToClipboard('0348731110', 'stk')}
                    title="Copy số tài khoản"
                  >
                    {copiedField === 'stk' ? <Check size={14} color="var(--calm-ink)" /> : <Copy size={14} />}
                    {copiedField === 'stk' ? (lang === 'vi' ? 'Đã copy' : 'Copied') : (lang === 'vi' ? 'Copy' : 'Copy')}
                  </button>
                </div>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{lang === 'vi' ? 'Chủ tài khoản' : 'Account Name'}</span>
                <span className="donate-val">LUONG DUY KHANG</span>
              </div>
              <div className="donate-info-item">
                <span className="donate-label">{lang === 'vi' ? 'Nội dung' : 'Memo'}</span>
                <span className="donate-val mono">ThreadScore Donate</span>
              </div>
            </div>
          </div>

          <p className="donate-thanks">
            <Heart size={14} weight="fill" color="var(--accent)" />{' '}
            {lang === 'vi'
              ? 'Mọi sự ủng hộ của bạn là động lực to lớn giúp QuackForge Studio tiếp tục phát triển các công cụ mở miễn phí.'
              : 'Every contribution empowers QuackForge Studio to keep building and maintaining free open-source tools.'}
          </p>
        </div>
      </div>
    </div>
  );
}
