// Global modal stack for ESC key coordination.
// When a modal is open on top of a drawer, we need the ESC key to close only
// the modal, not the drawer. Both use window capture keydown listeners, and
// the drawer's listener fires first (registered when the drawer mounts, before
// the modal). This stack lets a global handler intercept ESC first.

const stack: (() => void)[] = []

export function pushModal(onClose: () => void) {
  stack.push(onClose)
}

export function popModal(onClose: () => void) {
  const idx = stack.lastIndexOf(onClose)
  if (idx !== -1) stack.splice(idx, 1)
}

export function hasOpenModal() {
  return stack.length > 0
}

export function closeTopModal() {
  if (stack.length > 0) stack[stack.length - 1]()
}
