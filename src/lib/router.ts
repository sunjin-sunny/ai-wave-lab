import { useEffect, useState } from 'react'

// A tiny client-side router. The whole site only needs one dynamic route
// (/projects/:slug), so a full routing library isn't justified yet — this
// is ~20 lines instead of a new dependency. If the site grows into nested
// layouts or many more routes later, that's the point to reach for
// react-router instead.

const NAVIGATION_EVENT = 'wavelab:navigate'

export function navigate(path: string) {
  if (path === window.location.pathname) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const handleChange = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handleChange)
    window.addEventListener(NAVIGATION_EVENT, handleChange)
    return () => {
      window.removeEventListener('popstate', handleChange)
      window.removeEventListener(NAVIGATION_EVENT, handleChange)
    }
  }, [])

  return pathname
}
