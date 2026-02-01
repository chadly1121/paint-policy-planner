// Guard component that blocks access until Drive is connected and folders are created
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, FolderPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDriveConnection } from "@/hooks/useDriveConnection";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DriveRequiredGuardProps {
  children: ReactNode;
  moduleName?: string;
}

export function DriveRequiredGuard({ children, moduleName = "this module" }: DriveRequiredGuardProps) {
  const { isConnected, hasFolders, isLoading, error, initiateConnection, createFolders, refresh } = useDriveConnection();
  const { toast } = useToast();
  const [creatingFolders, setCreatingFolders] = useState(false);

  const handleCreateFolders = async () => {
    setCreatingFolders(true);
    try {
      await createFolders();
      toast({
        title: "Folders created",
        description: "Your Drive folder structure has been set up.",
      });
      await refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to create folders",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setCreatingFolders(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If connected and has folders, render children
  if (isConnected && hasFolders) {
    return <>{children}</>;
  }

  // Show setup required screen
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Cloud className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Google Drive Required</CardTitle>
          <CardDescription className="text-base">
            Connect Google Drive to access {moduleName}. All documents are stored and managed directly in Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Connect Drive */}
          <div className="flex items-start gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isConnected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {isConnected ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Connect Google Drive</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Authorize access to store and manage documents.
              </p>
              {!isConnected && (
                <Button onClick={initiateConnection} className="w-full">
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect Google Drive
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: Create Folder Structure */}
          <div className="flex items-start gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${hasFolders ? 'bg-green-500 text-white' : isConnected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {hasFolders ? <CheckCircle2 className="h-5 w-5" /> : "2"}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Create Folder Structure</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Set up folders for SOPs, Policies, Safety, Training, and Disciplinary.
              </p>
              {isConnected && !hasFolders && (
                <Button onClick={handleCreateFolders} disabled={creatingFolders} className="w-full">
                  {creatingFolders ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderPlus className="h-4 w-4 mr-2" />
                  )}
                  {creatingFolders ? "Creating..." : "Create Folders"}
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Documents are stored in your organization's Google Drive. 
              The app only stores metadata like assignments and acknowledgments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
