import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  title: string
  id?: string
}

export class SectionErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    if (!this.state.failed) return this.props.children

    return (
      <section className="panel section" id={this.props.id} aria-label={this.props.title}>
        <h2>{this.props.title}</h2>
        <p role="alert">此区域加载失败，其他区域仍可使用。请重新加载页面后再试。</p>
        <button className="ghost-button" type="button" onClick={() => window.location.reload()}>
          重新加载页面
        </button>
      </section>
    )
  }
}
