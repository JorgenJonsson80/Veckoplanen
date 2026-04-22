import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="px-6 py-8 text-center text-secondary">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="mb-2 font-semibold text-primary">Något gick fel</p>
          <p className="mb-5 text-sm">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2.5 bg-primary text-white border-0 rounded-lg cursor-pointer text-sm"
          >
            Försök igen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
