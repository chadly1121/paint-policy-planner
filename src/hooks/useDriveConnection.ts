import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

interface DriveToken {
  id: string;
  user_id: string;
  org_id: string;
  google_email: string;
  google_subject: string;
  is_primary: boolean;
  is_active: boolean;
  token_expires_at: string;
  last_refresh_at: string | null;
  last_refresh_error: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface DriveFolder {
  id: string;
  org_id: string;
  folder_type: string;
  drive_folder_id: string;
  drive_folder_name: string;
  parent_folder_id: string | null;
}

export function useDriveConnection() {
  const { user } = useAuth();
  const { org } = useOrganization();
  const [tokens, setTokens] = useState<DriveToken[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectionStatus = useCallback(async () => {
    if (!user?.id || !org?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch tokens for this user
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_drive_tokens')
        .select('*')
        .eq('org_id', org.id)
        .eq('is_active', true);

      if (tokenError) throw tokenError;
      setTokens(tokenData || []);

      // Fetch folders for this org
      const { data: folderData, error: folderError } = await supabase
        .from('org_drive_folders')
        .select('*')
        .eq('org_id', org.id);

      if (folderError) throw folderError;
      setFolders(folderData || []);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch connection status';
      setError(message);
      console.error('Drive connection fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, org?.id]);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DRIVE_AUTH_SUCCESS') {
        console.log('Drive auth success, refreshing...');
        fetchConnectionStatus();
      } else if (event.data?.type === 'DRIVE_AUTH_ERROR') {
        setError(event.data.error || 'Authentication failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchConnectionStatus]);

  const initiateConnection = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('drive-auth-init', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.auth_url) throw new Error('No auth URL received');

      // Open popup
      const popup = window.open(
        response.data.auth_url,
        'driveAuth',
        'width=600,height=700,scrollbars=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initiate connection';
      setError(message);
      console.error('Drive connection error:', err);
    }
  };

  const disconnect = async (tokenId: string) => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('drive-revoke', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { token_id: tokenId, reason: 'User requested disconnect' },
      });

      if (response.error) throw response.error;

      await fetchConnectionStatus();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
    }
  };

  const createFolders = async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('drive-create-folders', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      await fetchConnectionStatus();
      return response.data;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create folders';
      setError(message);
      throw err;
    }
  };

  const primaryToken = tokens.find(t => t.is_primary);
  const isConnected = tokens.length > 0;
  const hasFolders = folders.length > 0;

  return {
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
    refresh: fetchConnectionStatus,
  };
}
