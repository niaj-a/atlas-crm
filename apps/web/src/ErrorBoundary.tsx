import { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info);
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="center">
          <section className="panel auth" role="alert">
            <h1>Something went wrong</h1>
            <p>Atlas CRM hit an unexpected error. You can try again.</p>
            <p className="error">{this.state.message}</p>
            <button type="button" onClick={this.reset}>
              Try again
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
