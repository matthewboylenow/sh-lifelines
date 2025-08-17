import React from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  children?: React.ReactNode
}

export function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  className = '',
  id,
  name,
  children
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked)
    }
  }

  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          id={id}
          name={name}
          className="sr-only"
        />
        <div className={`
          w-4 h-4 border-2 rounded transition-all duration-200 flex items-center justify-center
          ${checked 
            ? 'bg-primary-600 border-primary-600' 
            : 'bg-white border-gray-300 hover:border-primary-600'
          }
          ${disabled ? 'opacity-50' : ''}
        `}>
          {checked && (
            <Check className="h-3 w-3 text-white stroke-[3]" />
          )}
        </div>
      </div>
      {children && (
        <span className="ml-2 text-sm text-gray-700">
          {children}
        </span>
      )}
    </label>
  )
}