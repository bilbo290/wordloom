import { useState, useEffect } from 'react'
import { DocumentContext } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

interface DocumentContextFormProps {
  documentContext?: DocumentContext
  onChange: (updates: Partial<DocumentContext>) => void
}

interface CustomField {
  key: string
  value: string
}

export function DocumentContextForm({ documentContext, onChange }: DocumentContextFormProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  useEffect(() => {
    if (documentContext?.customFields) {
      const fields = Object.entries(documentContext.customFields).map(([key, value]) => ({ key, value }))
      setCustomFields(fields)
    } else {
      setCustomFields([])
    }
  }, [documentContext?.customFields])

  const handleChange = (field: keyof DocumentContext, value: any) => {
    onChange({ [field]: value })
  }

  const handleCustomFieldsChange = (fields: CustomField[]) => {
    setCustomFields(fields)
    
    // Convert to object and update
    const customFieldsObj = fields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim()
      }
      return acc
    }, {} as Record<string, string>)
    
    onChange({ customFields: customFieldsObj })
  }

  const addCustomField = () => {
    const newFields = [...customFields, { key: '', value: '' }]
    handleCustomFieldsChange(newFields)
  }

  const removeCustomField = (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index)
    handleCustomFieldsChange(newFields)
  }

  const updateCustomField = (index: number, field: 'key' | 'value', newValue: string) => {
    const newFields = customFields.map((item, i) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    handleCustomFieldsChange(newFields)
  }

  return (
    <div className="space-y-4">
      {/* Purpose */}
      <div className="space-y-2">
        <Label htmlFor="purpose" className="text-xs text-muted-foreground">
          Document Purpose
        </Label>
        <Input
          id="purpose"
          placeholder="e.g., chapter, article, meeting notes, outline..."
          value={documentContext?.purpose || ''}
          onChange={(e) => handleChange('purpose', e.target.value)}
          className="h-8 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 text-sm"
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status" className="text-xs text-muted-foreground">
          Status
        </Label>
        <Select 
          value={documentContext?.status || 'draft'} 
          onValueChange={(value) => handleChange('status', value as DocumentContext['status'])}
        >
          <SelectTrigger className="h-8 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Notes */}
      <div className="space-y-2">
        <Label htmlFor="document-notes" className="text-xs text-muted-foreground">
          Document Notes
        </Label>
        <Textarea
          id="document-notes"
          placeholder="File-specific context, notes, or requirements..."
          value={documentContext?.documentNotes || ''}
          onChange={(e) => handleChange('documentNotes', e.target.value)}
          className="h-20 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300 text-sm enhanced-scrollbar overflow-y-auto resizable"
        />
      </div>

      {/* Custom Fields */}
      {(customFields.length > 0 || documentContext?.customFields) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Custom Fields</Label>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={addCustomField}
              className="h-6 px-2 text-xs hover:bg-primary/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          
          <div className="space-y-2">
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Key..."
                  value={field.key}
                  onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                  className="h-7 bg-background/50 text-xs flex-1"
                />
                <Input
                  placeholder="Value..."
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                  className="h-7 bg-background/50 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(index)}
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Field Button (when no custom fields exist) */}
      {customFields.length === 0 && !documentContext?.customFields && (
        <div className="pt-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addCustomField}
            className="h-7 text-xs border-dashed hover:bg-accent/50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Custom Field
          </Button>
        </div>
      )}
    </div>
  )
}