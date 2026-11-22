// Public HTML and CSS paint before downloading/evaluating the interactive application.
// No timers or network mocks are used to manufacture performance measurements.
import './product.css'
async function start() {
  try {
    await import('./bootstrap.jsx')
  } catch {
    const root = document.getElementById('root')
    const container = root.querySelector('.scan-card form') || root
    root.querySelector('.scan-fields [role="status"]')?.remove()
    const notice = document.createElement('div')
    notice.className = 'error-note'
    notice.setAttribute('role', 'alert')
    notice.textContent =
      'Address controls could not load. Check your connection and reload the page. '
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'button secondary'
    retry.textContent = 'Reload page'
    retry.addEventListener('click', () => window.location.reload())
    notice.appendChild(retry)
    container.appendChild(notice)
  }
}
if (document.getElementById('root').dataset.prerendered === 'true')
  requestAnimationFrame(() => requestAnimationFrame(start))
else start()
