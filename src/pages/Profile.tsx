import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Award, FileText, Trophy, Save, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import AvatarUpload from "@/components/profile/AvatarUpload";
import CertificateCard from "@/components/profile/CertificateCard";
import AwardCard from "@/components/profile/AwardCard";
import AddCertificateDialog from "@/components/profile/AddCertificateDialog";
import AddAwardDialog from "@/components/profile/AddAwardDialog";
import ExpiryReminders from "@/components/profile/ExpiryReminders";
import RedemptionHistory from "@/components/profile/RedemptionHistory";

const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const {
    profile,
    certificates,
    awards,
    loading,
    expiringCertificates,
    isOwnProfile,
    updateProfile,
    addCertificate,
    deleteCertificate,
    addAward,
    deleteAward,
    uploadFile,
  } = useEmployeeProfile(userId);

  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const handleEditBio = () => {
    setBio(profile?.bio || "");
    setEditingBio(true);
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    const { error } = await updateProfile({ bio });
    setSavingBio(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Bio updated successfully",
      });
      setEditingBio(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    return uploadFile(file, "avatars");
  };

  const handleAvatarSave = async (url: string) => {
    return updateProfile({ avatar_url: url });
  };

  const handleCertificateUpload = async (file: File) => {
    return uploadFile(file, "certificates");
  };

  const handleAwardUpload = async (file: File) => {
    return uploadFile(file, "awards");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expiry Reminders Banner */}
      {isOwnProfile && expiringCertificates.length > 0 && (
        <ExpiryReminders certificates={expiringCertificates} />
      )}

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <AvatarUpload
              currentUrl={profile.avatar_url}
              fullName={profile.full_name}
              onUpload={handleAvatarUpload}
              onSave={handleAvatarSave}
              disabled={!isOwnProfile}
            />
            
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-serif font-bold">{profile.full_name}</h1>
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.company_name && (
                  <p className="text-sm text-muted-foreground">{profile.company_name}</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Bio / Catch Phrase</Label>
                  {isOwnProfile && !editingBio && (
                    <Button variant="ghost" size="sm" onClick={handleEditBio}>
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {editingBio ? (
                  <div className="space-y-2">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself or add a personal catch phrase..."
                      rows={3}
                      maxLength={300}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{bio.length}/300</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBio(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveBio} disabled={savingBio}>
                          {savingBio && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          <Save className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {profile.bio || (isOwnProfile ? "Add a bio or personal catch phrase..." : "No bio yet")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemption History - only show on own profile */}
      {isOwnProfile && <RedemptionHistory />}

      {/* Certificates & Awards Tabs */}
      <Tabs defaultValue="certificates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Certificates ({certificates.length})
          </TabsTrigger>
          <TabsTrigger value="awards" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Awards ({awards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Training & Safety Certificates
                  </CardTitle>
                  <CardDescription>
                    Track your certifications and their expiry dates
                  </CardDescription>
                </div>
                {isOwnProfile && (
                  <AddCertificateDialog
                    onAdd={addCertificate}
                    onUpload={handleCertificateUpload}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isOwnProfile
                    ? "No certificates yet. Add your training and safety certificates!"
                    : "No certificates on file."
                  }
                </p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      id={cert.id}
                      name={cert.name}
                      issuingAuthority={cert.issuing_authority}
                      certificateUrl={cert.certificate_url}
                      issueDate={cert.issue_date}
                      expiryDate={cert.expiry_date}
                      canEdit={isOwnProfile}
                      onDelete={deleteCertificate}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Awards & Recognition
                  </CardTitle>
                  <CardDescription>
                    Celebrate your achievements and recognition
                  </CardDescription>
                </div>
                {isOwnProfile && (
                  <AddAwardDialog onAdd={addAward} onUpload={handleAwardUpload} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {awards.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isOwnProfile
                    ? "No awards yet. Add your achievements and recognition!"
                    : "No awards on file."
                  }
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {awards.map((award) => (
                    <AwardCard
                      key={award.id}
                      id={award.id}
                      title={award.title}
                      description={award.description}
                      imageUrl={award.image_url}
                      awardedDate={award.awarded_date}
                      canEdit={isOwnProfile}
                      onDelete={deleteAward}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
