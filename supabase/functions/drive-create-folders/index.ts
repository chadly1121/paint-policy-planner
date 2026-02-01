import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

// Template content for each module type
const TEMPLATE_CONTENT: Record<string, { title: string; body: string }> = {
  sops: {
    title: '_TEMPLATE - Standard Operating Procedure',
    body: `STANDARD OPERATING PROCEDURE (SOP)

═══════════════════════════════════════════════════════════════

⚠️ TEMPLATE INSTRUCTIONS: Keep this file as your template. To create a new SOP, use "Create New" in the app or make a copy of this document. Replace this text with your content.

═══════════════════════════════════════════════════════════════

DOCUMENT TITLE: [Enter SOP Title]
DOCUMENT NUMBER: SOP-[XXX]
EFFECTIVE DATE: [Date]
REVISION: [1.0]

───────────────────────────────────────────────────────────────

1. PURPOSE
Describe the purpose of this procedure and what it aims to accomplish.

2. SCOPE
Define who this procedure applies to and under what circumstances.

3. RESPONSIBILITIES
• Role 1: [Responsibility description]
• Role 2: [Responsibility description]

4. PROCEDURE
Step 1: [Detailed instruction]
Step 2: [Detailed instruction]
Step 3: [Detailed instruction]

5. SAFETY CONSIDERATIONS
List any safety precautions or PPE requirements.

6. REFERENCES
List related documents, regulations, or standards.

7. REVISION HISTORY
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial release |

───────────────────────────────────────────────────────────────
`,
  },
  policies: {
    title: '_TEMPLATE - Company Policy',
    body: `COMPANY POLICY

═══════════════════════════════════════════════════════════════

⚠️ TEMPLATE INSTRUCTIONS: Keep this file as your template. To create a new policy, use "Create New" in the app or make a copy of this document. Replace this text with your content.

═══════════════════════════════════════════════════════════════

POLICY TITLE: [Enter Policy Title]
POLICY NUMBER: POLICY-[XXX]
EFFECTIVE DATE: [Date]
APPROVED BY: [Name/Title]

───────────────────────────────────────────────────────────────

1. POLICY STATEMENT
State the policy clearly and concisely.

2. PURPOSE
Explain why this policy exists and its objectives.

3. SCOPE
Define who must follow this policy.

4. DEFINITIONS
• Term 1: Definition
• Term 2: Definition

5. POLICY DETAILS
Provide detailed policy requirements and guidelines.

6. COMPLIANCE
Describe consequences of non-compliance.

7. RELATED DOCUMENTS
List related policies, procedures, or regulations.

8. REVISION HISTORY
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial release |

───────────────────────────────────────────────────────────────
`,
  },
  safety: {
    title: '_TEMPLATE - Safety Protocol',
    body: `SAFETY PROTOCOL

═══════════════════════════════════════════════════════════════

⚠️ TEMPLATE INSTRUCTIONS: Keep this file as your template. To create a new safety protocol, use "Create New" in the app or make a copy of this document. Replace this text with your content.

═══════════════════════════════════════════════════════════════

PROTOCOL TITLE: [Enter Protocol Title]
DOCUMENT NUMBER: SAFETY-[XXX]
EFFECTIVE DATE: [Date]
RISK LEVEL: [Low/Medium/High/Critical]

───────────────────────────────────────────────────────────────

1. HAZARD IDENTIFICATION
Describe the hazards this protocol addresses.

2. RISK ASSESSMENT
• Likelihood: [Rare/Unlikely/Possible/Likely/Almost Certain]
• Consequence: [Insignificant/Minor/Moderate/Major/Catastrophic]
• Risk Rating: [Low/Medium/High/Extreme]

3. REQUIRED PPE
☐ Safety glasses
☐ Hard hat
☐ Gloves
☐ Steel-toed boots
☐ High-visibility vest
☐ Respirator
☐ Other: [Specify]

4. SAFE WORK PROCEDURES
Step 1: [Safety procedure]
Step 2: [Safety procedure]
Step 3: [Safety procedure]

5. EMERGENCY PROCEDURES
Describe what to do in case of emergency.

6. FIRST AID
Describe immediate first aid measures.

7. TRAINING REQUIREMENTS
List required training and certifications.

8. REVISION HISTORY
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial release |

───────────────────────────────────────────────────────────────
`,
  },
  training: {
    title: '_TEMPLATE - Training Requirement',
    body: `TRAINING REQUIREMENT

═══════════════════════════════════════════════════════════════

⚠️ TEMPLATE INSTRUCTIONS: Keep this file as your template. To create a new training document, use "Create New" in the app or make a copy of this document. Replace this text with your content.

═══════════════════════════════════════════════════════════════

TRAINING TITLE: [Enter Training Title]
DOCUMENT NUMBER: TRAIN-[XXX]
DURATION: [Estimated time]
FREQUENCY: [One-time/Annual/As needed]

───────────────────────────────────────────────────────────────

1. TRAINING OBJECTIVES
By the end of this training, participants will be able to:
• Objective 1
• Objective 2
• Objective 3

2. TARGET AUDIENCE
Define who must complete this training.

3. PREREQUISITES
List any required prior training or qualifications.

4. TRAINING CONTENT

Module 1: [Title]
• Topic A
• Topic B

Module 2: [Title]
• Topic A
• Topic B

5. ASSESSMENT
Describe how competency will be evaluated.

6. CERTIFICATION
Describe any certifications earned upon completion.

7. RESOURCES
List additional resources, videos, or materials.

8. REVISION HISTORY
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial release |

───────────────────────────────────────────────────────────────
`,
  },
  disciplinary: {
    title: '_TEMPLATE - Disciplinary Procedure',
    body: `DISCIPLINARY PROCEDURE

═══════════════════════════════════════════════════════════════

⚠️ TEMPLATE INSTRUCTIONS: Keep this file as your template. To create a new disciplinary procedure, use "Create New" in the app or make a copy of this document. Replace this text with your content.

═══════════════════════════════════════════════════════════════

PROCEDURE TITLE: [Enter Procedure Title]
DOCUMENT NUMBER: DISC-[XXX]
EFFECTIVE DATE: [Date]
CATEGORY: [Minor/Serious/Gross Misconduct]

───────────────────────────────────────────────────────────────

1. PURPOSE
Describe the purpose of this disciplinary procedure.

2. SCOPE
Define the behaviors or violations this procedure addresses.

3. APPLICABLE VIOLATIONS
• Violation type 1
• Violation type 2
• Violation type 3

4. PROGRESSIVE DISCIPLINE STEPS

Step 1: Verbal Warning
• Documentation required
• Timeline for improvement

Step 2: Written Warning
• Documentation required
• Timeline for improvement

Step 3: Final Written Warning
• Documentation required
• Consequences of further violation

Step 4: Termination
• Conditions and process

5. INVESTIGATION PROCESS
Describe how violations are investigated.

6. APPEAL PROCESS
Describe the employee's right to appeal.

7. DOCUMENTATION REQUIREMENTS
List required forms and records.

8. REVISION HISTORY
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial release |

───────────────────────────────────────────────────────────────
`,
  },
};

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

// Get valid access token (refresh if needed)
async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  const now = new Date();
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expiring soon, refreshing...');
    const refreshResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-token-refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenRecord.id }),
      }
    );
    
    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }
    
    // Re-fetch the token
    const { data: refreshedToken } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  
  return await decryptToken(tokenRecord.access_token_encrypted);
}

// Create a folder in Google Drive
async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<{ id: string; name: string }> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  if (parentId) {
    metadata.parents = [parentId];
  }
  
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create folder: ${error}`);
  }
  
  return await response.json();
}

// Create a Google Doc with content
async function createGoogleDoc(
  accessToken: string,
  title: string,
  parentFolderId: string,
  content: string
): Promise<{ id: string; name: string }> {
  // Step 1: Create the document in the folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      parents: [parentFolderId],
    }),
  });
  
  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create document: ${error}`);
  }
  
  const doc = await createResponse.json();
  
  // Step 2: Update document content using Docs API
  const updateResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`,
    {
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
              text: content,
            },
          },
        ],
      }),
    }
  );
  
  if (!updateResponse.ok) {
    console.error('Failed to update document content:', await updateResponse.text());
    // Don't fail - document was created, just empty
  }
  
  return doc;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate user authentication
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

    // Get user's org
    const { data: orgUser, error: orgError } = await userSupabase
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only admins can create folder structure
    if (orgUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get primary token for org
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

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Check if root folder already exists
    const { data: existingRoot } = await supabase
      .from('org_drive_folders')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', 'root')
      .single();

    let rootFolderId: string;
    let rootFolderName: string;
    const createdFolders: any[] = [];

    if (existingRoot) {
      rootFolderId = existingRoot.drive_folder_id;
      rootFolderName = existingRoot.drive_folder_name;
      console.log('Using existing root folder:', rootFolderId);
    } else {
      // Create root folder: SOPed-{org_id}
      rootFolderName = `SOPed-${orgUser.org_id}`;
      const rootFolder = await createDriveFolder(accessToken, rootFolderName);
      rootFolderId = rootFolder.id;
      
      // Get org_user_id for created_by
      const { data: orgUserRecord } = await supabase
        .from('org_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgUser.org_id)
        .single();

      // Store root folder
      await supabase.from('org_drive_folders').insert({
        org_id: orgUser.org_id,
        folder_type: 'root',
        drive_folder_id: rootFolderId,
        drive_folder_name: rootFolderName,
        created_by: orgUserRecord?.id,
      });

      createdFolders.push({ type: 'root', id: rootFolderId, name: rootFolderName });
      console.log('Created root folder:', rootFolderId);
    }

    // Create module subfolders
    const moduleFolders = ['SOPs', 'Policies', 'Safety', 'Training', 'Disciplinary'];
    
    for (const moduleName of moduleFolders) {
      const folderType = moduleName.toLowerCase();
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('org_drive_folders')
        .select('id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', folderType)
        .single();

      if (!existing) {
        const folder = await createDriveFolder(accessToken, moduleName, rootFolderId);
        
        const { data: orgUserRecord } = await supabase
          .from('org_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('org_id', orgUser.org_id)
          .single();

        const { data: rootRecord } = await supabase
          .from('org_drive_folders')
          .select('id')
          .eq('org_id', orgUser.org_id)
          .eq('folder_type', 'root')
          .single();

        await supabase.from('org_drive_folders').insert({
          org_id: orgUser.org_id,
          folder_type: folderType,
          drive_folder_id: folder.id,
          drive_folder_name: moduleName,
          parent_folder_id: rootRecord?.id,
          created_by: orgUserRecord?.id,
        });

        createdFolders.push({ type: folderType, id: folder.id, name: moduleName });
        console.log('Created folder:', moduleName);
      }
    }

    // Create Employee-Credentials folder
    const { data: existingCredentials } = await supabase
      .from('org_drive_folders')
      .select('id')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', 'employee-credentials')
      .single();

    if (!existingCredentials) {
      const credentialsFolder = await createDriveFolder(accessToken, 'Employee-Credentials', rootFolderId);
      
      const { data: orgUserRecord } = await supabase
        .from('org_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgUser.org_id)
        .single();

      const { data: rootRecord } = await supabase
        .from('org_drive_folders')
        .select('id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', 'root')
        .single();

      await supabase.from('org_drive_folders').insert({
        org_id: orgUser.org_id,
        folder_type: 'employee-credentials',
        drive_folder_id: credentialsFolder.id,
        drive_folder_name: 'Employee-Credentials',
        parent_folder_id: rootRecord?.id,
        created_by: orgUserRecord?.id,
      });

      createdFolders.push({ type: 'employee-credentials', id: credentialsFolder.id, name: 'Employee-Credentials' });
    }

    // Create template documents in each module folder
    const createdTemplates: any[] = [];
    for (const moduleName of moduleFolders) {
      const folderType = moduleName.toLowerCase();
      const templateConfig = TEMPLATE_CONTENT[folderType];
      
      if (templateConfig) {
        // Get the folder record
        const { data: folderRecord } = await supabase
          .from('org_drive_folders')
          .select('drive_folder_id')
          .eq('org_id', orgUser.org_id)
          .eq('folder_type', folderType)
          .single();
        
        if (folderRecord) {
          // Check if template already exists by listing folder contents
          const listResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderRecord.drive_folder_id}'+in+parents+and+name+contains+'_TEMPLATE'&fields=files(id,name)`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          
          const listResult = await listResponse.json();
          const templateExists = listResult.files && listResult.files.length > 0;
          
          if (!templateExists) {
            try {
              const templateDoc = await createGoogleDoc(
                accessToken,
                templateConfig.title,
                folderRecord.drive_folder_id,
                templateConfig.body
              );
              createdTemplates.push({
                module: folderType,
                id: templateDoc.id,
                name: templateDoc.name,
              });
              console.log(`Created template for ${folderType}:`, templateDoc.id);
            } catch (err) {
              console.error(`Failed to create template for ${folderType}:`, err);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      root_folder_id: rootFolderId,
      root_folder_name: rootFolderName,
      created_folders: createdFolders,
      created_templates: createdTemplates,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-create-folders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
