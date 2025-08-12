import { useState, useEffect } from 'react'
import { ProjectContext } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Settings, X, Plus, Trash2 } from 'lucide-react'

interface ProjectSettingsModalProps {
  projectContext: ProjectContext
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<ProjectContext>) => void
}

interface CustomField {
  key: string
  value: string
}

export function ProjectSettingsModal({ 
  projectContext, 
  isOpen, 
  onClose, 
  onSave 
}: ProjectSettingsModalProps) {
  const [formData, setFormData] = useState<Partial<ProjectContext>>({})
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  useEffect(() => {
    if (isOpen) {
      setFormData(projectContext)
      // Convert customFields object to array for editing
      const fields = projectContext.customFields 
        ? Object.entries(projectContext.customFields).map(([key, value]) => ({ key, value }))
        : []
      setCustomFields(fields)
    }
  }, [projectContext, isOpen])

  const handleSave = () => {
    // Convert custom fields array back to object
    const customFieldsObj = customFields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim()
      }
      return acc
    }, {} as Record<string, string>)

    onSave({
      ...formData,
      customFields: customFieldsObj
    })
    onClose()
  }

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }])
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const updateCustomField = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = customFields.map((item, i) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    setCustomFields(updated)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Configure project-wide context and AI guidelines
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of your project..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-20 bg-background/50 resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Writing Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Writing Context</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select 
                  value={formData.genre || 'other'} 
                  onValueChange={(value) => setFormData({ ...formData, genre: value as any })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiction">Fiction</SelectItem>
                    <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style">Writing Style</Label>
                <Select 
                  value={formData.style || 'casual'} 
                  onValueChange={(value) => setFormData({ ...formData, style: value as any })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="journalistic">Journalistic</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., general readers, technical professionals, students..."
                value={formData.audience || ''}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints">Writing Guidelines & Constraints</Label>
              <Textarea
                id="constraints"
                placeholder="e.g., Keep under 500 words, use active voice, avoid jargon..."
                value={formData.constraints || ''}
                onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                className="h-20 bg-background/50 resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Custom System Prompt (Optional)</Label>
              <Textarea
                id="system-prompt"
                placeholder="Override the default AI system prompt for this project..."
                value={formData.systemPrompt || ''}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                className="h-24 bg-background/50 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default system prompt
              </p>
            </div>
          </div>

          <Separator />

          {/* Custom Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Custom Fields</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addCustomField}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Field
              </Button>
            </div>
            
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    placeholder="Field name..."
                    value={field.key}
                    onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Value..."
                    value={field.value}
                    onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(index)}
                  className="hover:bg-destructive/10 hover:text-destructive mt-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {customFields.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No custom fields defined. Click "Add Field" to create project-specific metadata.
              </p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}