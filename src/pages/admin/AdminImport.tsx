import { useState, type FormEvent } from 'react'
import { Check, DownloadCloud, Star } from 'lucide-react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/errors'
import { compactNumber } from '../../lib/format'
import { FIELD_SEARCHES, searchGithub, type GithubResult, type GithubSearch } from '../../services/github.service'
import { importProjects } from '../../services/admin.service'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Input, Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, ListSkeleton } from '../../components/ui/States'
import { useToast } from '../../components/ui/Toast'

const LANGUAGES = ['', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Dart', 'Kotlin', 'Swift', 'Java', 'C#', 'PHP', 'Ruby', 'Solidity', 'C++', 'Elixir', 'Vue', 'Svelte']

export default function AdminImport() {
  const toast = useToast()
  const [query, setQuery] = useState<GithubSearch>({ language: '', topic: 'hacktoberfest', minStars: 200, signal: 'good-first-issues' })
  const [results, setResults] = useState<GithubResult[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (e?: FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const found = await searchGithub(query)
      setResults(found)
      setPicked(new Set(found.map((r) => r.repo.full_name)))
    } catch (err) {
      setError(errorMessage(err))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const doImport = async () => {
    if (!results) return
    const items = results.filter((r) => picked.has(r.repo.full_name)).map((r) => r.item)
    if (!items.length) return
    setImporting(true)
    try {
      const n = await importProjects(items)
      toast(`${n} projects imported or refreshed`)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setImporting(false)
    }
  }

  const togglePick = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Import projects</h1>
      <p className="mt-1 max-w-2xl text-text-secondary">
        Pull real projects that are asking for help from GitHub — developers, designers, writers, translators, marketers, testers and more. Projects already in the app are refreshed, never duplicated.
      </p>

      <Card className="mt-6 p-5">
        <form onSubmit={search} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Field label="Language">
            {(id) => (
              <Select id={id} value={query.language} onChange={(e) => setQuery({ ...query, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l || 'Any language'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Topic" optional hint={query.signal in FIELD_SEARCHES ? 'Not used for other fields' : undefined}>
            {(id) => (
              <Input id={id} value={query.topic} disabled={query.signal in FIELD_SEARCHES} placeholder="e.g. flutter, llm, web3" onChange={(e) => setQuery({ ...query, topic: e.target.value })} />
            )}
          </Field>
          <Field label="Looking for">
            {(id) => (
              <Select id={id} value={query.signal} onChange={(e) => setQuery({ ...query, signal: e.target.value as GithubSearch['signal'] })}>
                <optgroup label="Developers">
                  <option value="good-first-issues">Good first issues</option>
                  <option value="help-wanted-issues">Help wanted</option>
                </optgroup>
                <optgroup label="Other fields">
                  {Object.entries(FIELD_SEARCHES).map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              </Select>
            )}
          </Field>
          <Field label="Min. stars">
            {(id) => <Input id={id} type="number" min={0} value={query.minStars} onChange={(e) => setQuery({ ...query, minStars: Number(e.target.value) || 0 })} />}
          </Field>
          <Button type="submit" loading={loading} className="sm:col-span-2 lg:col-span-4">
            Search GitHub
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => search()} />
        ) : results === null ? null : results.length === 0 ? (
          <EmptyState title="Nothing matched" body="Try a broader topic or fewer stars." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {picked.size} of {results.length} selected
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPicked(picked.size === results.length ? new Set() : new Set(results.map((r) => r.repo.full_name)))}>
                  {picked.size === results.length ? 'Select none' : 'Select all'}
                </Button>
                <Button size="sm" icon={<DownloadCloud size={16} />} loading={importing} disabled={!picked.size} onClick={doImport}>
                  Import {picked.size}
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {results.map(({ repo: r, item }) => {
                const on = picked.has(r.full_name)
                return (
                  <button key={r.full_name} onClick={() => togglePick(r.full_name)} aria-pressed={on} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2/50">
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-accent bg-accent text-accent-ink' : 'border-border-strong')}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold text-text-primary">{r.full_name}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                          <Star size={12} className="text-gold" /> {compactNumber(r.stargazers_count)}
                        </span>
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-sm text-text-secondary">{r.description}</span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {item.c} · needs {item.r.join(', ')}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
