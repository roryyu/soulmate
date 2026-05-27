import * as React from "react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value: string | null
  displayValue: string | null
  isOpen: boolean
  toggleOpen: () => void
  close: () => void
  setSelectedValue: (value: string, displayValue: string) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

export interface SelectProps {
  value: string
  displayValue?: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  required?: boolean
}

export const Select: React.FC<SelectProps> = ({
  value,
  displayValue: propDisplayValue,
  onValueChange,
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [displayValue, setDisplayValue] = React.useState<string | null>(
    propDisplayValue || null
  )

  // 通用函数：从React节点中提取文本
  const extractTextFromNode = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node
    if (Array.isArray(node)) {
      return node.map(extractTextFromNode).join('')
    }
    if (React.isValidElement(node)) {
      return extractTextFromNode(node.props.children)
    }
    return ''
  }

  // 自动从SelectItem中获取显示值
  React.useEffect(() => {
    if (!value || propDisplayValue !== undefined) return
    
    let foundDisplayValue = ''
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.type as any).displayName === 'SelectItem') {
        if (child.props.value === value) {
          if (child.props.label) {
            foundDisplayValue = child.props.label
          } else {
            foundDisplayValue = extractTextFromNode(child.props.children)
          }
        }
      }
    })
    
    if (foundDisplayValue && foundDisplayValue !== displayValue) {
      setDisplayValue(foundDisplayValue)
    }
  }, [value, propDisplayValue, children, displayValue])

  // 处理外部传入的displayValue变化
  React.useEffect(() => {
    if (propDisplayValue !== undefined) {
      setDisplayValue(propDisplayValue)
    }
  }, [propDisplayValue])

  const toggleOpen = () => setIsOpen(!isOpen)
  const close = () => setIsOpen(false)

  const setSelectedValue = (newValue: string, newDisplayValue: string) => {
    setDisplayValue(newDisplayValue)
    onValueChange(newValue)
    close()
  }

  return (
    <SelectContext.Provider
      value={{
        value: value || null,
        displayValue,
        isOpen,
        toggleOpen,
        close,
        setSelectedValue,
      }}
    >
      <div className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) {
      throw new Error("SelectTrigger must be used within Select")
    }

    return (
      <button
        ref={ref}
        role="combobox"
        aria-expanded={context.isOpen}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        onClick={(e) => {
          e.preventDefault()
          context.toggleOpen()
        }}
        {...props}
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 h-4 w-4 opacity-50 transition-transform duration-200 ${
            context.isOpen ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

export interface SelectValueProps {
  placeholder?: string
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("SelectValue must be used within Select")
  }

  return (
    <span className="block truncate">
      {context.displayValue || placeholder}
    </span>
  )
}

export interface SelectContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) {
      throw new Error("SelectContent must be used within Select")
    }

    const internalRef = React.useRef<HTMLDivElement>(null)
    
    // 合并ref
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement)

    // 通用函数：从React节点中提取文本
    const extractTextFromNode = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node
      if (Array.isArray(node)) {
        return node.map(extractTextFromNode).join('')
      }
      if (React.isValidElement(node)) {
        return extractTextFromNode(node.props.children)
      }
      return ''
    }

    // 点击外部关闭
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          internalRef.current &&
          !internalRef.current.contains(event.target as Node) &&
          !(event.target as Element).closest('[role="combobox"]')
        ) {
          context.close()
        }
      }

      if (context.isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [context.isOpen, context.close])

    // 处理SelectItem点击
    const handleItemClick = (
      value: string,
      labelOrChildren: string | React.ReactNode,
      disabled: boolean
    ) => {
      if (!disabled) {
        // 从label或children中提取显示文本
        let displayText = ''
        if (typeof labelOrChildren === 'string') {
          displayText = labelOrChildren
        } else {
          displayText = extractTextFromNode(labelOrChildren)
        }
        if (!displayText) {
          displayText = value
        }
        
        context.setSelectedValue(value, displayText)
      }
    }

    // 包装SelectItem
    const renderChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && (child.type as any).displayName === 'SelectItem') {
        const props = child.props as any
        return React.cloneElement(child, {
          onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            handleItemClick(
              props.value,
              props.label || props.children,
              props.disabled || false
            )
          },
        })
      }
      return child
    })

    if (!context.isOpen) {
      return null
    }

    return (
      <div
        ref={internalRef}
        className={cn(
          "absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-input bg-background shadow-lg",
          className
        )}
        {...props}
      >
        <div className="max-h-60 overflow-y-auto">
          {renderChildren}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

export interface SelectItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  label?: string
  disabled?: boolean
}

export const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, value, label, children, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) {
      throw new Error("SelectItem must be used within Select")
    }

    const isSelected = context.value === value

    return (
      <button
        ref={ref}
        className={cn(
          "flex w-full items-center px-4 py-2 text-sm outline-none transition-colors",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground",
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)
SelectItem.displayName = "SelectItem"

