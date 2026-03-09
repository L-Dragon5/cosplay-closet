import { ActionIcon, Button, Transition } from "@mantine/core"
import { AppModal } from "@/frontend/components/AppModal"
import { useWindowScroll } from "@mantine/hooks"
import { IconArrowUp, IconPlus } from "@tabler/icons-react"
import { useAtomValue } from "jotai"
import { useState } from "react"
import { activeSectionAtom } from "@/frontend/atoms"
import { AddCharacterForm } from "./characters/AddCharacterForm"
import { AddItemForm } from "./items/AddItemForm"
import { AddLocationForm } from "./locations/AddLocationForm"
import { AddOutfitForm } from "./outfits/AddOutfitForm"
import { AddSeriesForm } from "./series/AddSeriesForm"

const SECTION_LABELS: Record<string, string> = {
  series: "Series",
  characters: "Character",
  items: "Item",
  locations: "Location",
  outfits: "Outfit Version",
}

export function AddButton() {
  const section = useAtomValue(activeSectionAtom)
  const [opened, setOpened] = useState(false)
  const label = SECTION_LABELS[section] ?? "Item"
  const [scroll, scrollTo] = useWindowScroll()
  const showScrollTop = scroll.y > window.innerHeight

  function handleSuccess() {
    setOpened(false)
  }

  return (
    <>
      <Transition mounted={showScrollTop} transition="slide-up" duration={200}>
        {(styles) => (
          <ActionIcon
            style={{
              ...styles,
              position: "fixed",
              bottom: 80,
              right: 24,
              zIndex: 100,
            }}
            size="lg"
            variant="default"
            onClick={() => scrollTo({ y: 0 })}
            aria-label="Scroll to top"
          >
            <IconArrowUp size={18} />
          </ActionIcon>
        )}
      </Transition>

      <Button
        leftSection={<IconPlus size={20} />}
        onClick={() => setOpened(true)}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}
        size="md"
      >
        Add
      </Button>

      <AppModal
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Add ${label}`}
        centered
      >
        {section === "series" && <AddSeriesForm onSuccess={handleSuccess} />}
        {section === "characters" && (
          <AddCharacterForm onSuccess={handleSuccess} />
        )}
        {section === "items" && <AddItemForm onSuccess={handleSuccess} />}
        {section === "locations" && (
          <AddLocationForm onSuccess={handleSuccess} />
        )}
        {section === "outfits" && <AddOutfitForm onSuccess={handleSuccess} />}
      </AppModal>
    </>
  )
}
