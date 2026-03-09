import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0D0F11', color: '#E8ECF1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'monospace',
        }}>
          <div style={{
            maxWidth: 600, background: '#151920', border: '1px solid #EF4444',
            borderRadius: 12, padding: '2rem',
          }}>
            <h2 style={{ color: '#EF4444', marginBottom: '1rem' }}>⚠️ Dashboard Error</h2>
            <pre style={{ color: '#F87171', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                marginTop: '1rem', padding: '0.5rem 1rem',
                background: '#1E2530', border: '1px solid #374151',
                borderRadius: 6, color: '#E8ECF1', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
