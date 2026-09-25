// ponytail: one process, one flag. Two restores at once would interleave their
// DROP TABLEs; a backup during a restore would dump half of one; a doc sync
// during a restore would write into tables being replaced.
let busy = false

export function tryLock(): boolean {
  if (busy) return false
  busy = true
  return true
}

export function unlock() {
  busy = false
}
