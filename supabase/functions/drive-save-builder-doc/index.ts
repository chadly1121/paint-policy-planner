import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

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
    case 'sops': return 'SOP-';
    case 'policies': return 'CO-POL-';
    case 'safety': return 'SAFETY-';
    case 'training': return 'TRAIN-';
    case 'disciplinary': return 'DISC-';
    default: return 'DOC-';
  }
}

function getFolderType(documentType: string): string {
  switch (documentType) {
    case 'sop': return 'sops';
    case 'policy': return 'policies';
    case 'safety': return 'safety';
    case 'training': return 'training';
    case 'disciplinary': return 'disciplinary';
    default: return 'sops';
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

async function getNextAutoNumber(accessToken: string, folderId: string, folderType: string): Promise<number> {
  const prefix = getPrefix(folderType);
  const docs = await listDocsInFolder(accessToken, folderId);

  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d+)(?:\\b|\\s|$)`, 'i');
  let max = 0;
  for (const doc of docs) {
    if (doc.name.toUpperCase().startsWith('_TEMPLATE')) continue;
    const m = doc.name.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return max + 1;
}

// Parse markdown and convert to Google Docs API batch update requests
function markdownToDocsRequests(markdown: string): { text: string; requests: any[] } {
  // Remove markdown code block wrappers if present
  let cleaned = markdown.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');
  
  const lines = cleaned.split('\n');
  const textLines: string[] = [];
  const formattingRanges: Array<{
    type: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'bold' | 'italic' | 'bullet' | 'numbered';
    startOffset: number;
    endOffset: number;
    text?: string;
  }> = [];
  
  let currentOffset = 1; // Google Docs uses 1-based indexing
  
  for (const line of lines) {
    let processedLine = line;
    let lineType: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'bullet' | 'numbered' | 'normal' = 'normal';
    
    // Check for headers
    if (line.startsWith('#### ')) {
      processedLine = line.slice(5);
      lineType = 'heading4';
    } else if (line.startsWith('### ')) {
      processedLine = line.slice(4);
      lineType = 'heading3';
    } else if (line.startsWith('## ')) {
      processedLine = line.slice(3);
      lineType = 'heading2';
    } else if (line.startsWith('# ')) {
      processedLine = line.slice(2);
      lineType = 'heading1';
    } else if (line.match(/^[-*] /)) {
      processedLine = line.slice(2);
      lineType = 'bullet';
    } else if (line.match(/^\d+\. /)) {
      processedLine = line.replace(/^\d+\. /, '');
      lineType = 'numbered';
    }
    
    // Track bold text positions (before removing markdown)
    const boldMatches = [...processedLine.matchAll(/\*\*(.+?)\*\*/g)];
    let adjustedLine = processedLine;
    let offsetAdjustment = 0;
    
    for (const match of boldMatches) {
      const matchStart = match.index! - offsetAdjustment;
      const innerText = match[1];
      formattingRanges.push({
        type: 'bold',
        startOffset: currentOffset + matchStart,
        endOffset: currentOffset + matchStart + innerText.length,
      });
      offsetAdjustment += 4; // Remove 4 asterisks
    }
    
    // Remove markdown bold syntax
    adjustedLine = adjustedLine.replace(/\*\*(.+?)\*\*/g, '$1');
    
    // Track italic text positions
    const italicMatches = [...adjustedLine.matchAll(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g)];
    offsetAdjustment = 0;
    
    for (const match of italicMatches) {
      const matchStart = match.index! - offsetAdjustment;
      const innerText = match[1];
      formattingRanges.push({
        type: 'italic',
        startOffset: currentOffset + matchStart,
        endOffset: currentOffset + matchStart + innerText.length,
      });
      offsetAdjustment += 2; // Remove 2 asterisks
    }
    
    // Remove markdown italic syntax
    adjustedLine = adjustedLine.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
    
    // Skip horizontal rules
    if (line.match(/^---$/) || line.match(/^─+$/)) {
      adjustedLine = '─'.repeat(50);
    }
    
    const lineLength = adjustedLine.length + 1; // +1 for newline
    
    if (lineType !== 'normal') {
      formattingRanges.push({
        type: lineType,
        startOffset: currentOffset,
        endOffset: currentOffset + adjustedLine.length,
      });
    }
    
    textLines.push(adjustedLine);
    currentOffset += lineLength;
  }
  
  const plainText = textLines.join('\n');
  const requests: any[] = [];
  
  // Apply formatting in reverse order (from end to start) to preserve indices
  const sortedRanges = formattingRanges.sort((a, b) => b.startOffset - a.startOffset);
  
  for (const range of sortedRanges) {
    if (range.type === 'heading1') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType',
        },
      });
    } else if (range.type === 'heading2') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          paragraphStyle: { namedStyleType: 'HEADING_2' },
          fields: 'namedStyleType',
        },
      });
    } else if (range.type === 'heading3') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          paragraphStyle: { namedStyleType: 'HEADING_3' },
          fields: 'namedStyleType',
        },
      });
    } else if (range.type === 'heading4') {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          paragraphStyle: { namedStyleType: 'HEADING_4' },
          fields: 'namedStyleType',
        },
      });
    } else if (range.type === 'bullet') {
      requests.push({
        createParagraphBullets: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
    } else if (range.type === 'numbered') {
      requests.push({
        createParagraphBullets: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset + 1 },
          bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
        },
      });
    } else if (range.type === 'bold') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset },
          textStyle: { bold: true },
          fields: 'bold',
        },
      });
    } else if (range.type === 'italic') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: range.startOffset, endIndex: range.endOffset },
          textStyle: { italic: true },
          fields: 'italic',
        },
      });
    }
  }
  
  return { text: plainText, requests };
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
    const { content, document_type, title } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'No content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      return new Response(JSON.stringify({ error: 'No active Drive connection. Please connect Google Drive first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target folder
    const folderType = getFolderType(document_type);
    const { data: targetFolder, error: folderError } = await supabase
      .from('org_drive_folders')
      .select('drive_folder_id')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', folderType)
      .single();

    if (folderError || !targetFolder) {
      return new Response(JSON.stringify({ error: `${folderType} folder not found. Please set up Drive folders first.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Generate auto-numbered name
    const prefix = getPrefix(folderType);
    const nextNumber = await getNextAutoNumber(accessToken, targetFolder.drive_folder_id, folderType);
    const autoName = `${prefix}${nextNumber} ${title || '( AI Generated )'}`;

    console.log('Creating document:', autoName, 'in folder:', folderType);

    // Create the Google Doc
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: autoName,
        mimeType: 'application/vnd.google-apps.document',
        parents: [targetFolder.drive_folder_id],
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create document: ${error}`);
    }

    const newDoc = await createResponse.json();
    console.log('Created document:', newDoc.id);

    // Convert markdown to formatted content
    const { text: plainText, requests: formatRequests } = markdownToDocsRequests(content);
    
    // Prepare the full document text with header
    const headerText = `${autoName}\n\n${'─'.repeat(50)}\n\n`;
    const fullText = headerText + plainText;
    
    // First, insert all text
    const insertRequest = {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: fullText,
          },
        },
      ],
    };

    const insertResponse = await fetch(`https://docs.googleapis.com/v1/documents/${newDoc.id}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insertRequest),
    });

    if (!insertResponse.ok) {
      console.warn('Failed to insert text:', await insertResponse.text());
    }

    // Apply header formatting to the document title
    const headerLength = headerText.length;
    const titleFormatRequests: any[] = [
      {
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: autoName.length + 1 },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType',
        },
      },
    ];

    // Adjust formatting requests offsets to account for the header
    const adjustedFormatRequests = formatRequests.map(req => {
      const adjusted = JSON.parse(JSON.stringify(req));
      if (adjusted.updateParagraphStyle) {
        adjusted.updateParagraphStyle.range.startIndex += headerLength;
        adjusted.updateParagraphStyle.range.endIndex += headerLength;
      } else if (adjusted.updateTextStyle) {
        adjusted.updateTextStyle.range.startIndex += headerLength;
        adjusted.updateTextStyle.range.endIndex += headerLength;
      } else if (adjusted.createParagraphBullets) {
        adjusted.createParagraphBullets.range.startIndex += headerLength;
        adjusted.createParagraphBullets.range.endIndex += headerLength;
      }
      return adjusted;
    });

    // Apply all formatting
    const allFormatRequests = [...titleFormatRequests, ...adjustedFormatRequests];
    
    if (allFormatRequests.length > 0) {
      const formatResponse = await fetch(`https://docs.googleapis.com/v1/documents/${newDoc.id}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: allFormatRequests }),
      });

      if (!formatResponse.ok) {
        console.warn('Failed to apply formatting:', await formatResponse.text());
      }
    }

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
      folder_type: folderType,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-save-builder-doc:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
