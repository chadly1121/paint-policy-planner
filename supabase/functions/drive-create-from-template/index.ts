import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

// Decryption helper
async function decryptToken(encryptedToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(DRIVE_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Get valid access token
async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshInvoke = await supabase.functions.invoke('drive-token-refresh', {
      body: { token_id: tokenRecord.id },
    });

    if (refreshInvoke.error) {
      throw new Error(`Failed to refresh token: ${refreshInvoke.error.message}`);
    }
    
    const { data: refreshedToken } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  
  return await decryptToken(tokenRecord.access_token_encrypted);
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPrefix(folderType: string): string {
  switch (folderType) {
    case 'sops':
      return 'SOP-';
    case 'policies':
      return 'CO-POL-';
    case 'safety':
      return 'SAFETY-';
    case 'training':
      return 'TRAIN-';
    case 'disciplinary':
      return 'DISC-';
    default:
      return 'DOC-';
  }
}

async function listDocsInFolder(accessToken: string, folderId: string): Promise<Array<{ id: string; name: string }>> {
  const baseQuery = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
  const results: Array<{ id: string; name: string }> = [];
  let pageToken: string | undefined;

  while (true) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', baseQuery);
    url.searchParams.set('fields', 'nextPageToken,files(id,name)');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('Failed to list docs:', await res.text());
      break;
    }

    const data = await res.json();
    for (const f of (data.files ?? [])) {
      if (f?.id && f?.name) results.push({ id: f.id, name: f.name });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return results;
}

// Find template file in folder (case-insensitive match on "_TEMPLATE")
async function findTemplateFile(accessToken: string, folderId: string): Promise<{ id: string; name: string } | null> {
  const docs = await listDocsInFolder(accessToken, folderId);
  const template = docs.find((d) => d.name.toUpperCase().startsWith('_TEMPLATE'));
  return template ?? null;
}

async function getNextAutoNumber(accessToken: string, folderId: string, folderType: string): Promise<number> {
  const prefix = getPrefix(folderType);
  const docs = await listDocsInFolder(accessToken, folderId);

  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d+)(?:\\b|\\s|$)`, 'i');
  let max = 0;
  for (const doc of docs) {
    // Ignore templates explicitly
    if (doc.name.toUpperCase().startsWith('_TEMPLATE')) continue;
    const m = doc.name.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return max + 1;
}

function buildDocumentName(prefix: string, number: number): string {
  return `${prefix}${number} ( INSERT NAME )`;
}

function getStarterOutline(folderType: string, documentHeader: string): string {
  const headerSection = [
    documentHeader,
    '',
    '─────────────────────────────────────',
    '',
  ];
  
  switch (folderType) {
    case 'sops':
      return [
        ...headerSection,
        'Purpose',
        '',
        'Scope',
        '',
        'Responsibilities',
        '',
        'Required PPE / Tools',
        '',
        'Procedure',
        '',
        'Safety Notes',
        '',
        'Training / Verification',
        '',
        'Revision History',
        '',
      ].join('\n');
    case 'policies':
      return [
        ...headerSection,
        'Policy Statement',
        '',
        'Scope',
        '',
        'Definitions',
        '',
        'Policy Details',
        '',
        'Responsibilities',
        '',
        'Enforcement',
        '',
        'Acknowledgment',
        '',
      ].join('\n');
    case 'safety':
      return [
        ...headerSection,
        'Purpose',
        '',
        'Scope',
        '',
        'Hazards',
        '',
        'Controls / PPE',
        '',
        'Procedure',
        '',
        'Emergency Response',
        '',
        'Training / Verification',
        '',
      ].join('\n');
    case 'training':
      return [
        ...headerSection,
        'Objective',
        '',
        'Requirements',
        '',
        'Frequency',
        '',
        'Materials',
        '',
        'Procedure',
        '',
        'Records',
        '',
      ].join('\n');
    case 'disciplinary':
      return [
        ...headerSection,
        'Purpose',
        '',
        'Scope',
        '',
        'Definitions',
        '',
        'Progressive Discipline Steps',
        '',
        'Documentation',
        '',
        'Appeals / Review',
        '',
      ].join('\n');
    default:
      return [...headerSection, 'Overview', '', 'Details', '', 'Notes', ''].join('\n');
  }
}

async function seedOutlineIfBlank(accessToken: string, docId: string, folderType: string, documentHeader: string) {
  // If no template exists, insert a starter outline via Google Docs API.
  const outline = getStarterOutline(folderType, documentHeader);

  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: outline,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('Failed to seed outline (continuing):', await res.text());
    }
  } catch (e) {
    console.warn('Failed to seed outline (continuing):', e);
  }
}

// Insert header into copied template doc
async function insertDocumentHeader(accessToken: string, docId: string, documentHeader: string) {
  const headerContent = documentHeader + '\n\n─────────────────────────────────────\n\n';

  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: headerContent,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('Failed to insert header (continuing):', await res.text());
    }
  } catch (e) {
    console.warn('Failed to insert header (continuing):', e);
  }
}

// Copy a file in Drive
async function copyDriveFile(
  accessToken: string,
  sourceFileId: string,
  newName: string,
  parentFolderId: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sourceFileId}/copy?fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newName,
        parents: [parentFolderId],
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to copy file: ${error}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { title, folder_type } = body;

    // Get user's org
    const { data: orgUser, error: orgError } = await userSupabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get primary token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .eq('is_active', true)
      .eq('is_primary', true)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ error: 'No active Drive connection' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target folder (default to 'sops')
    const targetFolderType = folder_type || 'sops';
    const { data: targetFolder, error: folderError } = await supabase
      .from('org_drive_folders')
      .select('drive_folder_id')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', targetFolderType)
      .single();

    if (folderError || !targetFolder) {
      return new Response(JSON.stringify({ error: `${targetFolderType} folder not found. Create folders first.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Find template in folder
    const template = await findTemplateFile(accessToken, targetFolder.drive_folder_id);

    // Get the next auto-number and build the document name with placeholder
    const prefix = getPrefix(targetFolderType);
    const nextNumber = await getNextAutoNumber(accessToken, targetFolder.drive_folder_id, targetFolderType);
    const autoGeneratedName = buildDocumentName(prefix, nextNumber);
    const documentHeader = autoGeneratedName; // e.g., "CO-POL-6 ( INSERT NAME )"
    
    // Use provided title or auto-generated name
    const finalTitle = (title && String(title).trim())
      ? String(title).trim()
      : autoGeneratedName;

    let newDoc: { id: string; name: string; webViewLink: string };

    if (template) {
      // Copy template to new document
      console.log('Found template:', template.name, 'copying to:', finalTitle);
      newDoc = await copyDriveFile(accessToken, template.id, finalTitle, targetFolder.drive_folder_id);
      
      // Insert the document header at the top of the copied template
      if (newDoc?.id) {
        await insertDocumentHeader(accessToken, newDoc.id, documentHeader);
      }
    } else {
      // No template found, create blank doc and seed outline
      console.log('No template found, creating blank document + seeding outline');
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalTitle,
          mimeType: 'application/vnd.google-apps.document',
          parents: [targetFolder.drive_folder_id],
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create document: ${error}`);
      }

      newDoc = await createResponse.json();

      // Best-effort: populate headings so user isn't left with a blank doc.
      if (newDoc?.id) {
        await seedOutlineIfBlank(accessToken, newDoc.id, targetFolderType, documentHeader);
      }
    }

    console.log('Created document:', newDoc.id, newDoc.name);

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    return new Response(JSON.stringify({
      success: true,
      file_id: newDoc.id,
      file_name: newDoc.name,
      web_view_link: newDoc.webViewLink,
      folder_type: targetFolderType,
      from_template: !!template,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-create-from-template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
