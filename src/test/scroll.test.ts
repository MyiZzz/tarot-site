import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollToSection } from '../lib/scroll'

afterEach(() => vi.restoreAllMocks())

describe('section navigation', () => {
  it.each([true, false])('respects reduced motion: %s', (reduceMotion) => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reduceMotion } as MediaQueryList)
    const section = document.createElement('section')
    section.id = 'scroll-target'
    section.scrollIntoView = vi.fn()
    document.body.append(section)

    scrollToSection(section.id)

    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: reduceMotion ? 'instant' : 'smooth',
      block: 'start',
    })
    section.remove()
  })

  it('allows a section that has not mounted yet', () => {
    expect(() => scrollToSection('missing-section')).not.toThrow()
  })
})
