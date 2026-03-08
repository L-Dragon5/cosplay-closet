import { Table } from "@mantine/core"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useLayoutEffect, useRef, useState } from "react"

export function VirtualTable<T extends { id: number }>({
  rows,
  columns,
  onRowClick,
  estimateSize = 48,
}: {
  rows: T[]
  columns: { header: string; width?: string | number; render: (item: NoInfer<T>) => React.ReactNode }[]
  onRowClick?: (item: NoInfer<T>) => void
  estimateSize?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    if (containerRef.current) {
      setScrollMargin(containerRef.current.offsetTop)
    }
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimateSize,
    overscan: 10,
    scrollMargin,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  const firstRow = virtualRows[0]
  const lastRow = virtualRows[virtualRows.length - 1]
  const paddingTop = firstRow
    ? firstRow.start - virtualizer.options.scrollMargin
    : 0
  const paddingBottom = lastRow
    ? totalSize - (lastRow.end - virtualizer.options.scrollMargin)
    : 0

  return (
    <div ref={containerRef}>
      <Table highlightOnHover striped stickyHeader stickyHeaderOffset={137} style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.header} style={{ width: col.width }} />
          ))}
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th key={col.header}>{col.header}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paddingTop > 0 && (
            <Table.Tr>
              <Table.Td
                colSpan={columns.length}
                style={{ height: paddingTop, padding: 0, border: "none" }}
              />
            </Table.Tr>
          )}
          {virtualRows.map((vRow) => {
            const item = rows[vRow.index]
            if (!item) return null
            return (
              <Table.Tr
                key={vRow.key}
                style={{ cursor: onRowClick ? "pointer" : undefined }}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <Table.Td key={col.header}>{col.render(item)}</Table.Td>
                ))}
              </Table.Tr>
            )
          })}
          {paddingBottom > 0 && (
            <Table.Tr>
              <Table.Td
                colSpan={columns.length}
                style={{ height: paddingBottom, padding: 0, border: "none" }}
              />
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  )
}
