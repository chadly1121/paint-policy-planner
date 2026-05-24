import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useDriveConnection } from '@/hooks/useDriveConnection';
import { DriveTestPanel } from './DriveTestPanel';
import DriveMigrationPanel from './DriveMigrationPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  FolderPlus,
  Link2,
  Unlink,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  FolderSync,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function DriveConnectionCard() {
  const {
    tokens,
    folders,
    primaryToken,
    isConnected,
    hasFolders,
    isLoading,
    error,
    initiateConnection,
    disconnect,
    createFolders,
    refresh,
  } = useDriveConnection();

  const [isCreatingFolders, setIsCreatingFolders] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error: fnError } = await supabase.functions.invoke('drive-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });
      if (fnError) throw fnError;
      const results = (data?.results ?? []) as Array<{
        module_type: string;
        files_found: number;
        records_created: number;
        records_updated: number;
        records_marked_removed: number;
        misplacements: number;
      }>;
      const totals = results.reduce(
        (acc, r) => ({
          found: acc.found + r.files_found,
          created: acc.created + r.records_created,
          updated: acc.updated + r.records_updated,
          removed: acc.removed + r.records_marked_removed,
          misplaced: acc.misplaced + r.misplacements,
        }),
        { found: 0, created: 0, updated: 0, removed: 0, misplaced: 0 }
      );
      toast.success('All folders synced', {
        description: `${totals.found} files • ${totals.created} new • ${totals.updated} updated • ${totals.removed} removed${totals.misplaced ? ` • ${totals.misplaced} misplaced` : ''}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      toast.error('Sync failed', { description: message });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    await initiateConnection();
    // Popup handles the rest
    setTimeout(() => setIsConnecting(false), 2000);
  };

  const handleDisconnect = async (tokenId: string) => {
    setIsDisconnecting(tokenId);
    try {
      await disconnect(tokenId);
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleCreateFolders = async () => {
    setIsCreatingFolders(true);
    try {
      await createFolders();
    } finally {
      setIsCreatingFolders(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Cloud className="h-5 w-5 text-success" />
              ) : (
                <CloudOff className="h-5 w-5 text-muted-foreground" />
              )}
              Google Drive Integration
            </CardTitle>
            <CardDescription>
              Connect your Google Drive to store and manage documents
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <AlertCircle className="h-5 w-5 text-warning" />
            )}
            <div>
              <p className="font-medium">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              {primaryToken && (
                <p className="text-sm text-muted-foreground">
                  Primary: {primaryToken.google_email}
                </p>
              )}
            </div>
          </div>
          
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect Google Drive
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reconnect
              </Button>
              {primaryToken && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleDisconnect(primaryToken.id)}
                  disabled={isDisconnecting === primaryToken.id}
                >
                  {isDisconnecting === primaryToken.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        {tokens.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Connected Accounts</h4>
            <div className="space-y-2">
              {tokens.map((token) => (
                <div 
                  key={token.id} 
                  className="flex items-center justify-between p-3 rounded-md border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.google_email}</span>
                        {token.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Connected {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
                        {token.last_used_at && (
                          <> • Last used {formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true })}</>
                        )}
                      </p>
                      {token.last_refresh_error && (
                        <p className="text-xs text-destructive">
                          Error: {token.last_refresh_error}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(token.id)}
                    disabled={isDisconnecting === token.id}
                  >
                    {isDisconnecting === token.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folder Status */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Drive Folders</h4>
              <Button 
                size="sm" 
                variant={hasFolders ? "outline" : "default"}
                onClick={handleCreateFolders}
                disabled={isCreatingFolders}
              >
                {isCreatingFolders ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4 mr-2" />
                )}
                {hasFolders ? "Sync Folders" : "Create Folders"}
              </Button>
            </div>
            
            {hasFolders ? (
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder) => (
                  <div 
                    key={folder.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <CheckCircle className="h-3 w-3 text-success" />
                    <span className="capitalize">{folder.folder_type.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No folders created yet. Click "Create Folders" to set up the Drive structure.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <Separator className="my-6" />
    
    <DriveMigrationPanel isConnected={isConnected} hasFolders={hasFolders} />

    <Separator className="my-6" />
    
    <DriveTestPanel />
  </>
  );
}
