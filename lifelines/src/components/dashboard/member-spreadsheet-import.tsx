'use client'

import { useMemo, useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Cell,
  ColumnMapping,
  columnLabels,
  detectColumns,
  membersFromRows,
  rowsFromCsv,
} from '@/lib/member-import'

interface GroupOption {
  id: string
  title: string
}

interface Props {
  groups: GroupOption[]
  defaultGroupId: string
  onClose: () => void
  /** Called after a successful upload with the server's summary. */
  onDone: (message: string, groupId: string) => void
}

const PREVIEW_ROWS = 8

/**
 * Add a group's members from an Excel file (or CSV), with a preview.
 *
 * The file is read in the browser; nothing is sent until the person has seen
 * who will be added and pressed the button.
 */
export function MemberSpreadsheetImport({ groups, defaultGroupId, onClose, onDone }: Props) {
  const [groupId, setGroupId] = useState(defaultGroupId)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<Cell[][] | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [twoNameColumns, setTwoNameColumns] = useState(false)
  const [reading, setReading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  const effectiveMapping = useMemo<ColumnMapping | null>(() => {
    if (!mapping) return null
    return twoNameColumns ? { ...mapping, name: null } : { ...mapping, first: null, last: null }
  }, [mapping, twoNameColumns])

  const people = useMemo(
    () => (rows && effectiveMapping ? membersFromRows(rows, effectiveMapping) : []),
    [rows, effectiveMapping]
  )
  const labels = useMemo(() => (rows && mapping ? columnLabels(rows, mapping) : []), [rows, mapping])

  const readFile = async (file: File) => {
    setError(null)
    setSkipped([])
    setRows(null)
    setMapping(null)
    setFileName(file.name)

    const lower = file.name.toLowerCase()
    if (lower.endsWith('.xls')) {
      setError(
        'This is an older Excel file (.xls). Open it in Excel, choose File → Save As → Excel Workbook (.xlsx), then upload the new file.'
      )
      return
    }
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      setError('Please choose an Excel file (.xlsx). A .csv file works too.')
      return
    }

    setReading(true)
    try {
      let data: Cell[][]
      if (lower.endsWith('.csv')) {
        data = rowsFromCsv(await file.text())
      } else {
        // Loaded only when needed, so the members page stays light.
        const { readSheet } = await import('read-excel-file/browser')
        data = (await readSheet(file)) as Cell[][]
      }
      data = data.filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
      if (data.length === 0) {
        setError('That file looks empty. Check the people are on the first sheet.')
        return
      }
      const detected = detectColumns(data)
      setRows(data)
      setMapping(detected)
      setTwoNameColumns(detected.name === null && (detected.first !== null || detected.last !== null))
    } catch (err) {
      console.error('Could not read spreadsheet:', err)
      setError("Couldn't read that file. Make sure it's an Excel file (.xlsx) and try again.")
    } finally {
      setReading(false)
    }
  }

  const setColumn = (key: keyof Omit<ColumnMapping, 'headerRow'>, value: string) =>
    setMapping(prev => (prev ? { ...prev, [key]: value === '' ? null : Number(value) } : prev))

  const send = async () => {
    if (!groupId || people.length === 0) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/lifelines/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: people.map(p => ({ personName: p.name, personEmail: p.email, personPhone: p.phone })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add members')
      if (data.data?.skipped?.length) {
        // Stay open so the skipped rows can be read.
        setSkipped(data.data.skipped)
        setRows(null)
        setMapping(null)
        onDone(data.message, groupId)
        return
      }
      onDone(data.message, groupId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add members')
    } finally {
      setSending(false)
    }
  }

  const columnSelect = (id: string, label: string, key: keyof Omit<ColumnMapping, 'headerRow'>, optional: boolean) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        id={id}
        value={mapping?.[key] ?? ''}
        onChange={(e) => setColumn(key, e.target.value)}
        className="form-input form-select w-full text-sm"
      >
        <option value="">{optional ? 'None' : 'Choose a column…'}</option>
        {labels.map((text, c) => (
          <option key={c} value={c}>{text}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="import-members-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-primary-600">
            <FileSpreadsheet className="h-5 w-5 mr-2" aria-hidden="true" />
            <h3 id="import-members-title" className="text-lg font-semibold">Add from a spreadsheet</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Upload an Excel file with one person per row. You&apos;ll see who will be added before anything
          is saved. People are added as members straight away, and no one is emailed.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="import-group" className="block text-sm font-medium text-gray-700 mb-1">
              LifeLine <span className="text-red-500">*</span>
            </label>
            <select
              id="import-group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="form-input form-select w-full"
            >
              <option value="">Choose a LifeLine…</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.title}</option>
              ))}
            </select>
          </div>

          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-400 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" aria-hidden="true" />
            <span className="font-medium text-primary-600">
              {fileName ? 'Choose a different file' : 'Choose an Excel file'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {fileName || '.xlsx (a .csv file works too)'}
            </span>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
                e.target.value = ''
              }}
            />
          </label>

          {reading && <p className="text-sm text-gray-600">Reading the file…</p>}

          {rows && mapping && (
            <>
              <fieldset className="rounded-lg border border-gray-200 p-4">
                <legend className="px-1 text-sm font-medium text-gray-700">Which columns are which</legend>
                <div className="mb-3 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={!twoNameColumns} onChange={() => setTwoNameColumns(false)} />
                    Name is in one column
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={twoNameColumns} onChange={() => setTwoNameColumns(true)} />
                    First and last name are separate
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {twoNameColumns ? (
                    <>
                      {columnSelect('col-first', 'First name', 'first', false)}
                      {columnSelect('col-last', 'Last name', 'last', false)}
                    </>
                  ) : (
                    columnSelect('col-name', 'Name', 'name', false)
                  )}
                  {columnSelect('col-email', 'Email', 'email', true)}
                  {columnSelect('col-phone', 'Phone', 'phone', true)}
                  <div>
                    <label htmlFor="col-header" className="block text-xs font-medium text-gray-600 mb-1">Headings row</label>
                    <select
                      id="col-header"
                      value={mapping.headerRow}
                      onChange={(e) => setMapping(prev => (prev ? { ...prev, headerRow: Number(e.target.value) } : prev))}
                      className="form-input form-select w-full text-sm"
                    >
                      <option value={-1}>No headings</option>
                      {rows.slice(0, 6).map((_, r) => (
                        <option key={r} value={r}>Row {r + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>

              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {people.length === 0
                    ? 'No one found yet. Check the name column above.'
                    : `${people.length} ${people.length === 1 ? 'person' : 'people'} to add`}
                </p>
                {people.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {people.slice(0, PREVIEW_ROWS).map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-900">{p.name}</td>
                            <td className="px-3 py-2 text-gray-600 break-all">{p.email || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.phone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {people.length > PREVIEW_ROWS && (
                      <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                        and {people.length - PREVIEW_ROWS} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {skipped.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium mb-1">These rows were skipped:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {skipped.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" onClick={onClose} variant="outline" disabled={sending}>
            {skipped.length > 0 ? 'Done' : 'Cancel'}
          </Button>
          {rows && (
            <Button onClick={send} disabled={sending || !groupId || people.length === 0}>
              {sending
                ? 'Adding...'
                : `Add ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
