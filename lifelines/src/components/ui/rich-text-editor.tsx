'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link,
  Quote,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from './Button'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  className?: string
  disabled?: boolean
  showPreview?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = 200,
  maxHeight = 500,
  className = '',
  disabled = false,
  showPreview = true
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Auto-resize functionality
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = scrollHeight + 'px'
    }
  }, [value, minHeight, maxHeight])

  const insertAtCursor = (startTag: string, endTag: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)
    
    const newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end)
    onChange(newText)
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + startTag.length + selectedText.length + endTag.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const wrapSelection = (startTag: string, endTag: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)
    
    if (selectedText) {
      const newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end)
      onChange(newText)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start, start + startTag.length + selectedText.length + endTag.length)
      }, 0)
    } else {
      insertAtCursor(startTag, endTag)
    }
  }

  const insertAtNewLine = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value
    const beforeCursor = text.substring(0, start)
    const afterCursor = text.substring(start)
    
    // Add newline before if not at start of line
    const needsNewline = beforeCursor && !beforeCursor.endsWith('\n')
    const insertion = (needsNewline ? '\n' : '') + prefix
    
    const newText = beforeCursor + insertion + afterCursor
    onChange(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newPos = start + insertion.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const formatText = (command: string) => {
    switch (command) {
      case 'bold':
        wrapSelection('**', '**')
        break
      case 'italic':
        wrapSelection('*', '*')
        break
      case 'underline':
        wrapSelection('<u>', '</u>')
        break
      case 'quote':
        insertAtNewLine('> ')
        break
      case 'list':
        insertAtNewLine('- ')
        break
      case 'orderedList':
        insertAtNewLine('1. ')
        break
      case 'link':
        const url = prompt('Enter URL:')
        if (url) {
          wrapSelection(`[`, `](${url})`)
        }
        break
      case 'heading':
        insertAtNewLine('## ')
        break
    }
  }

  const renderPreview = (text: string) => {
    // Simple markdown-like rendering
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-2">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>')
  }

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: Type, command: 'heading', title: 'Heading' },
    { icon: Quote, command: 'quote', title: 'Quote' },
    { icon: List, command: 'list', title: 'Bullet List' },
    { icon: ListOrdered, command: 'orderedList', title: 'Numbered List' },
    { icon: Link, command: 'link', title: 'Insert Link' },
  ]

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {toolbarButtons.map(({ icon: Icon, command, title }) => (
            <Button
              key={command}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText(command)}
              disabled={disabled || isPreview}
              title={title}
              className="h-8 w-8 p-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        
        {showPreview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            disabled={disabled}
            title={isPreview ? 'Edit' : 'Preview'}
            className="flex items-center space-x-1"
          >
            {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="text-xs">{isPreview ? 'Edit' : 'Preview'}</span>
          </Button>
        )}
      </div>

      {/* Editor/Preview Area */}
      <div className="relative">
        {isPreview ? (
          <div 
            className="p-4 prose max-w-none"
            style={{ minHeight: minHeight }}
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full p-4 border-none outline-none resize-none
              ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            `}
            style={{ 
              minHeight: minHeight,
              maxHeight: maxHeight,
              overflowY: 'auto'
            }}
            onKeyDown={(e) => {
              // Handle keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault()
                    formatText('bold')
                    break
                  case 'i':
                    e.preventDefault()
                    formatText('italic')
                    break
                  case 'u':
                    e.preventDefault()
                    formatText('underline')
                    break
                }
              }
            }}
          />
        )}
      </div>

      {/* Character count and help */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>{value.length} characters</span>
          {!isPreview && (
            <span>
              **bold** *italic* [link](url) ## heading &gt; quote - list
            </span>
          )}
        </div>
        {!isPreview && (
          <span>
            Ctrl+B/I/U for formatting
          </span>
        )}
      </div>
    </div>
  )
}