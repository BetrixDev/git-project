import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01FreeIcons,
  Cancel01FreeIcons,
  Loading03FreeIcons,
  SparklesFreeIcons,
} from '@hugeicons/core-free-icons'
import { useGenerateProjects } from '@/hooks/use-generate-projects'

export function ExpandableGenerateButton() {
  const { generateProjects, isGenerating } = useGenerateProjects()
  const [isExpanded, setIsExpanded] = useState(false)
  const [guidance, setGuidance] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  const handleSubmit = () => {
    generateProjects({ guidance: guidance.trim() || undefined })
    setGuidance('')
    setIsExpanded(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setIsExpanded(false)
      setGuidance('')
    }
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    setGuidance('')
  }

  if (isGenerating) {
    return (
      <button className="landing-btn-generate group" disabled>
        <span className="landing-btn-shimmer" />
        <span className="relative flex items-center gap-3">
          <HugeiconsIcon
            icon={Loading03FreeIcons}
            className="size-5 animate-spin"
          />
          <span>Generating...</span>
        </span>
      </button>
    )
  }

  return (
    <div
      className={`expandable-generate-container ${isExpanded ? 'expanded' : ''}`}
    >
      <button
        className={`landing-btn-generate group expandable-generate-btn ${isExpanded ? 'hidden-btn' : ''}`}
        onClick={() => setIsExpanded(true)}
        aria-label="Generate Projects"
      >
        <span className="landing-btn-shimmer" />
        <span className="relative flex items-center gap-3">
          <HugeiconsIcon icon={SparklesFreeIcons} className="size-5" />
          <span>Generate Projects</span>
        </span>
      </button>
      <div
        className={`expandable-generate-input-wrapper ${isExpanded ? 'visible' : ''}`}
      >
        <div className="expandable-generate-inner">
          <button
            type="button"
            onClick={handleCollapse}
            className="expandable-generate-close"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01FreeIcons} className="size-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Guide generation (optional)..."
            className="expandable-generate-input"
          />

          <button
            type="button"
            onClick={handleSubmit}
            className="expandable-generate-submit"
            aria-label="Submit"
          >
            <HugeiconsIcon icon={ArrowRight01FreeIcons} className="size-5" />
          </button>
        </div>

        <p className="expandable-generate-hint">
          e.g. "focus on CLI tools" or "use Rust" — press Enter to generate
        </p>
      </div>
    </div>
  )
}
