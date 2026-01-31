import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useDriveConnection } from '@/hooks/useDriveConnection';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Download, 
  Mail, 
  Loader2,
  CheckCircle,
  AlertCircle,
  FileUp
} from 'lucide-react';

export function DriveTestPanel() {
  const { isConnected, hasFolders, primaryToken } = useDriveConnection();
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testFileId, setTestFileId] = useState<string | null>(null);
  const [exportedFile, setExportedFile] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateTestDoc = async () => {
    clearMessages();
    setIsCreatingDoc(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create a test Google Doc via Drive API
      const response = await supabase.functions.invoke('drive-create-test-doc', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          title: `Test Document - ${new Date().toISOString()}`,
          content: `# Test Document\n\nThis is a test document created at ${new Date().toLocaleString()}\n\n## Purpose\nThis document was created to test the Google Drive integration.\n\n## Features Tested\n- Document creation\n- Native Google Docs format\n- Storage in SOPed folder structure`
        }
      });

      if (response.error) throw response.error;
      
      setTestFileId(response.data.file_id);
      setSuccess(`Test document created: ${response.data.file_name}`);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create test document';
      setError(message);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleExportDoc = async (format: 'docx' | 'pdf') => {
    if (!testFileId) {
      setError('Create a test document first');
      return;
    }

    clearMessages();
    setIsExporting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('drive-export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          file_id: testFileId,
          format 
        }
      });

      if (response.error) throw response.error;
      
      setExportedFile(response.data.file_name);
      setSuccess(`Exported to ${format.toUpperCase()}: ${response.data.file_name} (${response.data.size_bytes} bytes)`);

      // Trigger download
      if (response.data.content_base64) {
        const binary = atob(response.data.content_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { 
          type: format === 'docx' 
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.file_name;
        a.click();
        URL.revokeObjectURL(url);
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export document';
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!testFileId) {
      setError('Create a test document first');
      return;
    }
    if (!emailTo) {
      setError('Enter an email address');
      return;
    }

    clearMessages();
    setIsSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('drive-export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          file_id: testFileId,
          format: 'docx',
          send_email: true,
          email_to: emailTo,
          email_subject: 'Test Document from SOPed'
        }
      });

      if (response.error) throw response.error;
      
      if (response.data.email_sent) {
        setSuccess(`Email sent successfully to ${emailTo}`);
      } else {
        setError(response.data.email_error || 'Failed to send email');
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drive Integration Test</CardTitle>
          <CardDescription>Connect Google Drive first to run tests</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Google Drive account in the Drive tab before testing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!hasFolders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drive Integration Test</CardTitle>
          <CardDescription>Create folder structure first</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please create the folder structure in the Drive tab before testing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Drive Integration Test
        </CardTitle>
        <CardDescription>
          Test document creation, export, and email functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">{success}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Create Test Doc */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 1: Create Test Document</h4>
          <p className="text-sm text-muted-foreground">
            Creates a native Google Doc in your SOPs folder
          </p>
          <Button 
            onClick={handleCreateTestDoc} 
            disabled={isCreatingDoc}
          >
            {isCreatingDoc ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4 mr-2" />
            )}
            Create Test Document
          </Button>
          {testFileId && (
            <p className="text-sm text-muted-foreground">
              File ID: <code className="bg-muted px-1 rounded">{testFileId}</code>
            </p>
          )}
        </div>

        <Separator />

        {/* Step 2: Export */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 2: Export Document</h4>
          <p className="text-sm text-muted-foreground">
            Export the test document to DOCX or PDF format
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => handleExportDoc('docx')} 
              disabled={isExporting || !testFileId}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export as DOCX
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExportDoc('pdf')} 
              disabled={isExporting || !testFileId}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export as PDF
            </Button>
          </div>
        </div>

        <Separator />

        {/* Step 3: Send Email */}
        <div className="space-y-3">
          <h4 className="font-medium">Step 3: Send via Email</h4>
          <p className="text-sm text-muted-foreground">
            Send the document as a DOCX attachment via email
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="emailTo" className="sr-only">Email address</Label>
              <Input
                id="emailTo"
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSending || !testFileId || !emailTo}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </div>
        </div>

        <Separator />

        {/* Connection Info */}
        <div className="text-sm text-muted-foreground">
          <p>Connected as: <strong>{primaryToken?.google_email}</strong></p>
        </div>
      </CardContent>
    </Card>
  );
}
