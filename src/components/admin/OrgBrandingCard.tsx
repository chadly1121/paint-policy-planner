import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Upload, Loader2, Save, Image } from "lucide-react";

const OrgBrandingCard = () => {
  const { org, refresh, isOrgAdmin } = useOrg();
  const { toast } = useToast();
  
  const [tagline, setTagline] = useState(org?.tagline || "");
  const [logoUrl, setLogoUrl] = useState(org?.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOrgAdmin || !org) {
    return null;
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Logo must be less than 2MB",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${org.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("org-branding")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("org-branding")
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const newLogoUrl = `${data.publicUrl}?t=${Date.now()}`;
      setLogoUrl(newLogoUrl);

      toast({
        title: "Logo uploaded",
        description: "Your organization logo has been uploaded. Click Save to apply.",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("orgs")
        .update({
          logo_url: logoUrl || null,
          tagline: tagline || null,
        })
        .eq("id", org.id);

      if (error) throw error;

      await refresh();

      toast({
        title: "Branding saved",
        description: "Your organization branding has been updated.",
      });
    } catch (error) {
      console.error("Error saving branding:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save branding. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Branding
        </CardTitle>
        <CardDescription>
          Customize your organization's logo and tagline. These will be displayed throughout the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Organization Logo</Label>
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="h-full w-full rounded-lg object-contain p-2"
                />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline / Motto</Label>
          <Textarea
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Enter your organization's tagline or motto..."
            className="resize-none"
            rows={2}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            {tagline.length}/200 characters
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Branding
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrgBrandingCard;
