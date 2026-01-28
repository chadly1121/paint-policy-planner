import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddAwardDialogProps {
  onAdd: (award: {
    title: string;
    description?: string;
    image_url?: string;
    awarded_date?: string;
  }) => Promise<{ error: Error | null }>;
  onUpload: (file: File) => Promise<{ url: string | null; error: Error | null }>;
}

const AddAwardDialog = ({ onAdd, onUpload }: AddAwardDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [awardedDate, setAwardedDate] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setAwardedDate("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 10MB",
      });
      return;
    }

    setUploading(true);
    const { url, error } = await onUpload(file);
    setUploading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } else if (url) {
      setImageUrl(url);
      toast({
        title: "Image uploaded",
        description: "Award image uploaded successfully",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Award title is required",
      });
      return;
    }

    setSaving(true);
    const { error } = await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      image_url: imageUrl || undefined,
      awarded_date: awardedDate || undefined,
    });
    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Award added successfully",
      });
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Award
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Award</DialogTitle>
          <DialogDescription>
            Add an award or recognition to your profile
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="award-title">Award Title *</Label>
            <Input
              id="award-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Employee of the Month"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="award-description">Description</Label>
            <Textarea
              id="award-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this award for?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="award-date">Date Awarded</Label>
            <Input
              id="award-date"
              type="date"
              value={awardedDate}
              onChange={(e) => setAwardedDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Award Photo</Label>
            <div className="space-y-2">
              {imageUrl && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                  <img
                    src={imageUrl}
                    alt="Award preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-2 h-4 w-4" />
                  )}
                  {imageUrl ? "Change Photo" : "Upload Photo"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Award
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAwardDialog;
