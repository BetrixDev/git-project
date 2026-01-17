import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useAtom } from 'jotai'
import { atom } from 'jotai'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

export const editGenerationDisplayNameAtom = atom<Id<'generations'> | null>(
  null,
)

export function EditGenerationDialog() {
  const [generationId, setGenerationId] = useAtom(editGenerationDisplayNameAtom)
  const [displayName, setDisplayName] = useState('')

  const generation = useQuery(
    api.projects.getGenerationById,
    generationId ? { id: generationId } : 'skip',
  )

  const updateDisplayName = useMutation(api.projects.updateGenerationDisplayName)

  useEffect(() => {
    if (generation) {
      setDisplayName(
        generation.displayName ||
          generation.guidance ||
          `${generation.projects.length} ideas`,
      )
    }
  }, [generation])

  const handleSave = async () => {
    if (!generationId || !displayName.trim()) return

    try {
      await updateDisplayName({
        generationId,
        displayName: displayName.trim(),
      })
      toast.success('Display name updated')
      setGenerationId(null)
    } catch {
      toast.error('Failed to update display name')
    }
  }

  const handleClose = () => {
    setGenerationId(null)
    setDisplayName('')
  }

  return (
    <Dialog open={!!generationId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Display Name</DialogTitle>
        </DialogHeader>
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter display name..."
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
