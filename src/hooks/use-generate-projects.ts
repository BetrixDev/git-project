import { useState } from 'react'
import { useAction, useMutation } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

interface GenerateOptions {
  guidance?: string
  parentGenerationId?: Id<'generations'>
  parentProjectId?: string
  parentProjectName?: string
  parentProjectDescription?: string
}

export function useGenerateProjects() {
  const { user } = useUser()
  const navigate = useNavigate()
  const createGeneration = useMutation(api.projects.createGeneration)
  const generateProjectsAction = useAction(
    api.initialGeneration.generateInitialProjectIdeas,
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const githubUsername = user?.externalAccounts?.find(
    (acc) => acc.provider === 'github',
  )?.username

  const generateProjects = async (options: GenerateOptions = {}) => {
    if (!githubUsername) {
      toast.error('GitHub account not connected')
      return null
    }

    if (isGenerating) {
      return null
    }

    setIsGenerating(true)

    try {
      // Step 1: Create the generation record immediately
      const generationId = await createGeneration({
        guidance: options.guidance?.trim() || undefined,
        parentGenerationId: options.parentGenerationId,
        parentProjectId: options.parentProjectId,
        parentProjectName: options.parentProjectName,
      })

      // Step 2: Navigate immediately to the new generation
      navigate({
        to: '/projectIdeas',
        search: { generationId },
      })

      toast.success('Generation started', {
        description: 'Your project ideas are being generated',
      })

      // Step 3: Trigger the AI generation in the background (don't await)
      generateProjectsAction({
        generationId,
        githubUsername,
        guidance: options.guidance?.trim() || undefined,
        parentProjectName: options.parentProjectName,
        parentProjectDescription: options.parentProjectDescription,
      }).catch((error) => {
        console.error('Generation failed:', error)
        // Error state will be reflected in the generation record
      })

      return generationId
    } catch (error) {
      console.error('Failed to create generation:', error)
      toast.error('Failed to start generation', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateProjects,
    isGenerating,
    canGenerate: !!githubUsername,
    githubUsername,
  }
}
