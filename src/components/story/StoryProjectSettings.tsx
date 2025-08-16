import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { X, Plus, Settings, Save } from 'lucide-react'
import type { StoryProject, StorySettings } from '@/lib/story-types'

interface StoryProjectSettingsProps {
  project: StoryProject
  onSave: (settings: StorySettings) => void
  onClose: () => void
}

export function StoryProjectSettings({ project, onSave, onClose }: StoryProjectSettingsProps) {
  const [settings, setSettings] = useState<StorySettings>(project.settings)
  const [newTheme, setNewTheme] = useState('')

  const handleSave = () => {
    onSave(settings)
  }

  const addTheme = () => {
    if (newTheme.trim() && !settings.themes.includes(newTheme.trim())) {
      setSettings({
        ...settings,
        themes: [...settings.themes, newTheme.trim()]
      })
      setNewTheme('')
    }
  }

  const removeTheme = (theme: string) => {
    setSettings({
      ...settings,
      themes: settings.themes.filter(t => t !== theme)
    })
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Story Settings
              </CardTitle>
              <CardDescription>
                Configure the settings for "{project.title}"
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Narrative Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Narrative Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select 
                  value={settings.tone} 
                  onValueChange={(value: any) => setSettings({ ...settings, tone: value })}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="perspective">Perspective</Label>
                <Select 
                  value={settings.perspective} 
                  onValueChange={(value: any) => setSettings({ ...settings, perspective: value })}
                >
                  <SelectTrigger id="perspective">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First Person</SelectItem>
                    <SelectItem value="third-limited">Third Person Limited</SelectItem>
                    <SelectItem value="third-omniscient">Third Person Omniscient</SelectItem>
                    <SelectItem value="second">Second Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tense">Tense</Label>
                <Select 
                  value={settings.tense} 
                  onValueChange={(value: any) => setSettings({ ...settings, tense: value })}
                >
                  <SelectTrigger id="tense">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select 
                  value={settings.targetAudience} 
                  onValueChange={(value: any) => setSettings({ ...settings, targetAudience: value })}
                >
                  <SelectTrigger id="audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="children">Children</SelectItem>
                    <SelectItem value="young-adult">Young Adult</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Themes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Themes</h3>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {settings.themes.map(theme => (
                  <Badge key={theme} variant="secondary" className="flex items-center gap-1">
                    {theme}
                    <button
                      onClick={() => removeTheme(theme)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a theme..."
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTheme()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTheme}
                  disabled={!newTheme.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}