export const scrollToSection = (sectionId: string) => {
  const section = document.getElementById(sectionId)

  if (typeof section?.scrollIntoView !== 'function') {
    return
  }

  section.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  })
}
