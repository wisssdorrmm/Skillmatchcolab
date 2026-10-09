import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { errorMessage } from '../lib/errors'
import { getSavedProjectIds, saveProject, unsaveProject } from '../services/saved.service'

/** Bookmarked project ids with optimistic toggling. */
export function useSaved() {
  const { user } = useAuth()
  const toast = useToast()
  const [saved, setSaved] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) getSavedProjectIds(user.id).then(setSaved).catch(() => {})
  }, [user])

  const toggle = useCallback(
    async (projectId: string) => {
      if (!user) return
      const wasSaved = saved.has(projectId)
      setSaved((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.delete(projectId)
        else next.add(projectId)
        return next
      })
      try {
        if (wasSaved) await unsaveProject(user.id, projectId)
        else await saveProject(user.id, projectId)
        toast(wasSaved ? 'Removed from saved' : 'Saved for later')
      } catch (err) {
        setSaved((prev) => {
          const next = new Set(prev)
          if (wasSaved) next.add(projectId)
          else next.delete(projectId)
          return next
        })
        toast(errorMessage(err), 'error')
      }
    },
    [user, saved, toast],
  )

  return { saved, toggle }
}
