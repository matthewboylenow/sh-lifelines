/**
 * Turn a spreadsheet of people into members to add.
 *
 * Parish spreadsheets come in every shape: one "Name" column or first and
 * last apart, a heading row or none, emails and phones in any order. This
 * finds the columns it can, lets the person adjust them, and produces the
 * list to preview. No database access, so it runs in the browser.
 */

export type Cell = string | number | boolean | Date | null | undefined

export interface ColumnMapping {
  /** Row index of the headings, or -1 when the sheet has none. */
  headerRow: number
  /** A single column holding the whole name. */
  name: number | null
  first: number | null
  last: number | null
  email: number | null
  phone: number | null
}

export interface ImportedMember {
  name: string
  email: string
  phone: string
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/
const PHONE = /^[\d\s().+\-x]{7,}$/i

export function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toLocaleDateString()
  return String(cell).replace(/\s+/g, ' ').trim()
}

/** Comma-separated text, quoted fields and all, into rows of cells. */
export function rowsFromCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function headingKind(text: string): keyof Omit<ColumnMapping, 'headerRow'> | null {
  const t = text.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (/\b(e ?mail|email address)\b/.test(t)) return 'email'
  if (/\b(phone|cell|mobile|telephone|tel)\b/.test(t)) return 'phone'
  if (/\b(first|given|forename)\b/.test(t)) return 'first'
  if (/\b(last|surname|family)\b/.test(t)) return 'last'
  if (/\b(full name|name|member|participant|attendee|person)\b/.test(t)) return 'name'
  return null
}

/** Best guess at which column is which. The person can correct it. */
export function detectColumns(rows: Cell[][]): ColumnMapping {
  const mapping: ColumnMapping = { headerRow: -1, name: null, first: null, last: null, email: null, phone: null }

  // A heading row: one of the first few rows with at least one recognisable
  // heading and no email addresses in it.
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const found: Partial<ColumnMapping> = {}
    rows[r].forEach((cell, c) => {
      const text = cellText(cell)
      if (EMAIL.test(text)) return
      const kind = headingKind(text)
      if (kind && found[kind] === undefined) found[kind] = c
    })
    const hasName = found.name !== undefined || found.first !== undefined || found.last !== undefined
    if (hasName || found.email !== undefined) {
      Object.assign(mapping, found, { headerRow: r })
      break
    }
  }

  // Fill gaps from the data itself.
  const body = rows.slice(mapping.headerRow + 1, mapping.headerRow + 31)
  const width = Math.max(0, ...rows.map(r => r.length))
  const share = (c: number, test: (s: string) => boolean) => {
    const values = body.map(r => cellText(r[c])).filter(Boolean)
    return values.length ? values.filter(test).length / values.length : 0
  }
  const used = () =>
    new Set([mapping.name, mapping.first, mapping.last, mapping.email, mapping.phone].filter((c): c is number => c !== null))

  if (mapping.email === null) {
    for (let c = 0; c < width; c++) if (!used().has(c) && share(c, s => EMAIL.test(s)) >= 0.5) { mapping.email = c; break }
  }
  if (mapping.phone === null) {
    for (let c = 0; c < width; c++) if (!used().has(c) && share(c, s => PHONE.test(s) && /\d{3}/.test(s)) >= 0.5) { mapping.phone = c; break }
  }
  if (mapping.name === null && mapping.first === null && mapping.last === null) {
    for (let c = 0; c < width; c++) {
      if (!used().has(c) && share(c, s => /[a-z]/i.test(s) && !EMAIL.test(s)) >= 0.5) {
        mapping.name = c
        break
      }
    }
  }
  // A full-name column wins over first/last when the sheet has both.
  if (mapping.name !== null) {
    mapping.first = null
    mapping.last = null
  }
  return mapping
}

/** The people the mapping describes, without blanks or repeats. */
export function membersFromRows(rows: Cell[][], mapping: ColumnMapping): ImportedMember[] {
  const seen = new Set<string>()
  const members: ImportedMember[] = []
  for (const row of rows.slice(mapping.headerRow + 1)) {
    const at = (c: number | null) => (c === null ? '' : cellText(row[c]))
    const name =
      mapping.name !== null
        ? at(mapping.name)
        : [at(mapping.first), at(mapping.last)].filter(Boolean).join(' ')
    if (name.replace(/[^a-z]/gi, '').length < 2) continue

    const rawEmail = at(mapping.email).split(/[;,\s]+/)[0]?.toLowerCase() ?? ''
    const email = EMAIL.test(rawEmail) ? rawEmail : ''
    const phone = at(mapping.phone)
    const key = email || name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    members.push({ name, email, phone })
  }
  return members
}

/** Column headings to show in the mapping dropdowns. */
export function columnLabels(rows: Cell[][], mapping: ColumnMapping): string[] {
  const width = Math.max(0, ...rows.map(r => r.length))
  return Array.from({ length: width }, (_, c) => {
    const heading = mapping.headerRow >= 0 ? cellText(rows[mapping.headerRow]?.[c]) : ''
    const sample = rows.slice(mapping.headerRow + 1).map(r => cellText(r[c])).find(Boolean) ?? ''
    const letter = String.fromCharCode(65 + (c % 26))
    return heading ? `${letter}: ${heading}` : `${letter}${sample ? ` (e.g. ${sample.slice(0, 24)})` : ''}`
  })
}
