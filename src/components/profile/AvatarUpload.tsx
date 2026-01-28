import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentUrl: string | null;
  fullName: string;
  onUpload: (file: File) => Promise<{ url: string | null; error: Error | null }>;
  onSave: (url: string) => Promise<{ error: Error | null }>;
  disabled?: boolean;
}

const AvatarUpload = ({ currentUrl, fullName, onUpload, onSave, disabled }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB",
      });
      return;
    }

    setUploading(true);
    try {
      const { url, error: uploadError } = await onUpload(file);
      if (uploadError) throw uploadError;
      if (!url) throw new Error("No URL returned");

      const { error: saveError } = await onSave(url);
      if (saveError) throw saveError;

      toast({
        title: "Success",
        description: "Profile picture updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload image",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative inline-block">
      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
        <AvatarImage src={currentUrl || undefined} alt={fullName} />
        <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {!disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default AvatarUpload;
