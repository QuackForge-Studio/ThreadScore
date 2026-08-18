import React, { Component, type ReactNode } from 'react';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ThreadScore Extension Crash caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#1A1817' }}>
          <div
            style={{
              padding: 16,
              background: '#FFF5F5',
              border: '1px solid #FECACA',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontWeight: 700 }}>
              <Warning size={20} weight="fill" />
              <span>Đã xảy ra lỗi giao diện</span>
            </div>
            <p style={{ fontSize: 13, color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
              {this.state.error?.message || 'Lỗi không xác định khi hiển thị dữ liệu.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#1A1817',
                color: '#FFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              <ArrowClockwise size={14} weight="bold" /> Tải lại Extension
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
