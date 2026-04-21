import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px 24px', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(45,80,22,0.12)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', margin: '0 0 8px' }}>Något gick fel</h2>
            <p style={{ color: 'var(--clr-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Ett oväntat fel uppstod. Dina data är sparade — ladda om sidan för att fortsätta.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 24px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
            >
              Ladda om sidan
            </button>
            {import.meta.env.DEV && (
              <pre style={{ marginTop: '16px', fontSize: '11px', color: '#999', textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
