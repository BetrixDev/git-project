import { useMutation, useQuery } from 'convex/react'
import { useAtom } from 'jotai'
import { atom } from 'jotai'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

export const deleteGenerationAtom = atom<Id<'generations'> | null>(null)

export function DeleteGenerationDialog() {
  const [generationId, setGenerationId] = useAtom(deleteGenerationAtom)
  const navigate = useNavigate()

  let currentGenerationId: string | undefined
  try {
    const search = useSearch({ strict: false })
    currentGenerationId = search?.generationId
  } catch {
    // Not on a route with search params
  }

  const generation = useQuery(
    api.projects.getGenerationById,
    generationId ? { id: generationId } : 'skip',
  )

  const history = useQuery(api.projects.getGenerationHistory)

  const deleteGeneration = useMutation(api.projects.deleteGeneration)

  const handleDelete = async () => {
    if (!generationId) return

    const isViewingDeleted = currentGenerationId === generationId

    try {
      await deleteGeneration({ generationId })
      toast.success('Generation deleted')
      setGenerationId(null)

      if (isViewingDeleted) {
        const nextGeneration = history?.find((g) => g._id !== generationId)
        if (nextGeneration) {
          navigate({
            to: '/projectIdeas',
            search: { generationId: nextGeneration._id },
          })
        } else {
          navigate({ to: '/' })
        }
      }
    } catch {
      toast.error('Failed to delete generation')
    }
  }

  const handleClose = () => {
    setGenerationId(null)
  }

  const displayText =
    generation?.displayName ||
    generation?.guidance ||
    (generation ? `${generation.projects.length} ideas` : 'this generation')

  return (
    <Dialog open={!!generationId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Generation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{displayText}"? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
