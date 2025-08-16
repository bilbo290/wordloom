import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Plus } from 'lucide-react'

interface NewProjectDialogProps {
  onCreateProject: (title: string, premise: string, genre: string, targetLength: string) => void
  onClose: () => void
}

export function NewProjectDialog({ onCreateProject, onClose }: NewProjectDialogProps) {
  const [title, setTitle] = useState('')
  const [premise, setPremise] = useState('')
  const [genre, setGenre] = useState('')
  const [targetLength, setTargetLength] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !premise.trim() || !genre || !targetLength) {
      return
    }

    onCreateProject(title.trim(), premise.trim(), genre, targetLength)
  }

  const isValid = title.trim() && premise.trim() && genre && targetLength

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Story Project</CardTitle>
              <CardDescription>
                Let's start with the basics of your story
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
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                placeholder="Enter your story title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Premise */}
            <div className="space-y-2">
              <Label htmlFor="premise">Story Premise</Label>
              <Textarea
                id="premise"
                placeholder="Describe your story idea in a few sentences..."
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Select a genre..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="sci-fi">Science Fiction</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="literary">Literary Fiction</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="historical">Historical Fiction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Length */}
            <div className="space-y-2">
              <Label htmlFor="length">Target Length</Label>
              <Select value={targetLength} onValueChange={setTargetLength}>
                <SelectTrigger id="length">
                  <SelectValue placeholder="Select target length..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short Story (1,000 - 7,500 words)</SelectItem>
                  <SelectItem value="novella">Novella (17,500 - 40,000 words)</SelectItem>
                  <SelectItem value="novel">Novel (50,000+ words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isValid}
                className="shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}