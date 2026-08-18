import { X, Sparkle, Brain, Fire, ChartBar } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

interface HowScoreWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowScoreWorksModal({ isOpen, onClose }: HowScoreWorksModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card how-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('how.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Brain size={20} weight="fill" color="var(--accent)" />
            </div>
            <div>
              <span className="how-modal-eyebrow">{t('how.eyebrow')}</span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{t('how.title')}</h3>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <p className="how-modal-subtitle">{t('how.subtitle')}</p>

          <div className="how-steps-list">
            <div className="how-step-item">
              <div className="how-step-num">1</div>
              <div className="how-step-content">
                <h4 className="how-step-title">{t('how.step1.title')}</h4>
                <p className="how-step-desc">{t('how.step1.desc')}</p>
              </div>
            </div>

            <div className="how-step-item">
              <div className="how-step-num">2</div>
              <div className="how-step-content">
                <h4 className="how-step-title">{t('how.step2.title')}</h4>
                <p className="how-step-desc">{t('how.step2.desc')}</p>
              </div>
            </div>

            <div className="how-step-item">
              <div className="how-step-num">3</div>
              <div className="how-step-content">
                <h4 className="how-step-title">{t('how.step3.title')}</h4>
                <p className="how-step-desc">{t('how.step3.desc')}</p>
              </div>
            </div>
          </div>

          <div className="how-tiers-info">
            <div className="how-tier-pill anger">
              <Fire size={14} weight="fill" /> 70 - 100: Bùng nổ (Gay gắt)
            </div>
            <div className="how-tier-pill neutral">
              <ChartBar size={14} weight="fill" /> 30 - 69: Trung lập
            </div>
            <div className="how-tier-pill calm">
              <Sparkle size={14} weight="fill" /> 0 - 29: Vui vẻ (Tích cực)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
