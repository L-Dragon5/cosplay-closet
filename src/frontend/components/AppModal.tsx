import { Modal, type ModalProps } from "@mantine/core"
import { useEffect } from "react"
import { popModal, pushModal } from "@/frontend/modalStack"

// Wrapper around Mantine Modal that coordinates ESC key handling with drawers.
// Registers itself in the global modal stack so the app-level ESC capture
// handler can close only this modal (not the underlying drawer) when ESC fires.
export function AppModal({ opened, onClose, ...props }: ModalProps) {
  useEffect(() => {
    if (!opened) return
    pushModal(onClose)
    return () => popModal(onClose)
  }, [opened, onClose])

  return (
    <Modal opened={opened} onClose={onClose} closeOnEscape={false} {...props} />
  )
}
