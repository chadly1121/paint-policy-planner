import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Video, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl: string | null;
  documentName: string;
  onSave: (url: string | null) => Promise<{ success: boolean; driveUpdateFailed?: boolean }>;
}

export function VideoUrlDialog({
  open,
  onOpenChange,
  currentUrl,
  documentName,
  onSave,
}: VideoUrlDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);

  // Reset URL when dialog opens
  useEffect(() => {
    if (open) {
      setUrl(currentUrl || "");
    }
  }, [open, currentUrl]);

  const isValidVideoUrl = (url: string) => {
    if (!url.trim()) return true; // Empty is valid (removes video)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\//;
    return youtubeRegex.test(url) || vimeoRegex.test(url);
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    
    if (trimmedUrl && !isValidVideoUrl(trimmedUrl)) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid YouTube or Vimeo URL.",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await onSave(trimmedUrl || null);
      if (result.success) {
        toast({
          title: trimmedUrl ? "Video URL saved" : "Video removed",
          description: result.driveUpdateFailed 
            ? "Saved to app, but couldn't update the Drive document."
            : trimmedUrl 
              ? "The video will now appear in the document." 
              : "The video has been removed from the document.",
        });
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to save",
          description: "Could not save the video URL. Please try again.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const result = await onSave(null);
      if (result.success) {
        toast({
          title: "Video removed",
          description: "The video has been removed from the document.",
        });
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Add Video
          </DialogTitle>
          <DialogDescription>
            Add a YouTube or Vimeo video to "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Supported: YouTube, Vimeo
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentUrl && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Video
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
