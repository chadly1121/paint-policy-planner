// Cron entrypoint: runs drive-sync for every org with an active primary Drive token.
// Invoked daily by pg_cron. Uses service role to enumerate orgs, then synthesizes an
// admin-user JWT context per org by calling drive-sync directly with that admin's session.
//
// Since edge functions can't mint user JWTs without the auth admin API, we instead
// duplicate the per-org sync inline using the existing token records. This keeps the
// cron self-contained and avoids exposing a service-role bypass in drive-sync itself.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get("DRIVE_ENCRYPTION_KEY")!;

const MODULE_FOLDER_MAP: Record<string, string> = {
  sops: "sops",
  policies: "policies",
  safety: "safety",
  training: "training",
  disciplinary: "disciplinary",
  forms: "forms",
};

const COMPANY_TABLE_MAP: Record<string, { table: string; sourceKeyField: string }> = {
  policies: { table: "company_policies", sourceKeyField: "source_policy_key" },
  sops: { table: "company_sops", sourceKeyField: "source_sop_key" },
  safety: { table: "company_safety", sourceKeyField: "source_safety_key" },
  training: { table: "company_training", sourceKeyField: "source_training_key" },
  disciplinary: { table: "company_disciplinary", sourceKeyField: "source_disciplinary_key" },
};

function parseDocIdExternal(name: string): { id: string; prefix: string } | null {
  const stripped = name.replace(/\.[^/.]+$/, "");
  const m = stripped.match(/^ROP-(POL|SOP|FRM|SAF|TRN|DSC)-(\d{3})/i);
  if (!m) return null;
  const prefix = m[1].toUpperCase();
  return { id: `ROP-${prefix}-${m[2]}`, prefix };
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(DRIVE_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const combined = Uint8Array.from(atob(encryptedToken), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, encrypted);
  return decoder.decode(decrypted);
}

async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-token-refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_id: tokenRecord.id }),
      },
    );
    if (!refreshResponse.ok) throw new Error("Failed to refresh token");
    const { data: refreshedToken } = await supabase
      .from("user_drive_tokens")
      .select("access_token_encrypted")
      .eq("id", tokenRecord.id)
      .single();
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  return await decryptToken(tokenRecord.access_token_encrypted);
}

async function syncOrg(supabase: any, tokenRecord: any) {
  const accessToken = await getValidAccessToken(tokenRecord, supabase);

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("id, user_id, org_id")
    .eq("user_id", tokenRecord.user_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!orgUser) return { skipped: true, reason: "no_org_user" };

  let totalFound = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalRemoved = 0;

  for (const moduleType of Object.keys(MODULE_FOLDER_MAP)) {
    const folderType = MODULE_FOLDER_MAP[moduleType];
    const { data: folderRecord } = await supabase
      .from("org_drive_folders")
      .select("drive_folder_id")
      .eq("org_id", orgUser.org_id)
      .eq("folder_type", folderType)
      .maybeSingle();
    if (!folderRecord) continue;

    const query = encodeURIComponent(
      `'${folderRecord.drive_folder_id}' in parents and trashed = false`,
    );
    const fields = "files(id,name,mimeType,createdTime,modifiedTime)";
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listResponse.ok) continue;
    const listData = await listResponse.json();
    const driveFiles = listData.files || [];
    const driveFileIds = new Set(driveFiles.map((f: any) => f.id));
    totalFound += driveFiles.length;

    if (moduleType === "forms") {
      const { data: existing } = await supabase
        .from("company_forms")
        .select("id, drive_file_id, title, is_active, doc_id_external, drive_modified_time")
        .eq("user_id", tokenRecord.user_id)
        .not("drive_file_id", "is", null);
      const existingMap = new Map((existing || []).map((s: any) => [s.drive_file_id, s]));
      for (const file of driveFiles) {
        const baseTitle = file.name.replace(/\.[^/.]+$/, "");
        const parsed = parseDocIdExternal(file.name);
        const driveModifiedTime = file.modifiedTime ?? null;
        const ex = existingMap.get(file.id);
        if (ex) {
          const patch: any = {};
          if (ex.title !== baseTitle) patch.title = baseTitle;
          if (ex.doc_id_external !== (parsed?.id ?? null)) patch.doc_id_external = parsed?.id ?? null;
          if (!ex.is_active) patch.is_active = true;
          const exMs = ex.drive_modified_time ? new Date(ex.drive_modified_time).getTime() : null;
          const inMs = driveModifiedTime ? new Date(driveModifiedTime).getTime() : null;
          if (exMs !== inMs) patch.drive_modified_time = driveModifiedTime;
          if (Object.keys(patch).length) {
            await supabase.from("company_forms").update(patch).eq("id", ex.id);
            totalUpdated++;
          }
        } else {
          await supabase.from("company_forms").insert({
            user_id: tokenRecord.user_id,
            source_form_key: file.id,
            title: baseTitle,
            drive_file_id: file.id,
            drive_folder_id: folderRecord.drive_folder_id,
            doc_id_external: parsed?.id ?? null,
            drive_modified_time: driveModifiedTime,
            is_active: true,
          });
          totalCreated++;
        }
      }
      for (const [driveId, form] of existingMap) {
        if (!driveFileIds.has(driveId) && form.is_active) {
          await supabase.from("company_forms").update({ is_active: false }).eq("id", form.id);
          totalRemoved++;
        }
      }
      continue;
    }

    const { data: existingSops } = await supabase
      .from("sops")
      .select("id, drive_file_id, title, status, doc_id_external, drive_modified_time")
      .eq("org_id", orgUser.org_id)
      .not("drive_file_id", "is", null);
    const sopsMap = new Map((existingSops || []).map((s: any) => [s.drive_file_id, s]));

    for (const file of driveFiles) {
      const baseTitle = file.name.replace(/\.[^/.]+$/, "");
      const parsed = parseDocIdExternal(file.name);
      const docIdExternal = parsed?.id ?? null;
      const driveModifiedTime = file.modifiedTime ?? null;
      const ex = sopsMap.get(file.id);
      if (ex) {
        const patch: any = {};
        if (ex.title !== baseTitle) patch.title = baseTitle;
        if (ex.doc_id_external !== docIdExternal) patch.doc_id_external = docIdExternal;
        if (ex.status !== "active") patch.status = "active";
        const exMs = ex.drive_modified_time ? new Date(ex.drive_modified_time).getTime() : null;
        const inMs = driveModifiedTime ? new Date(driveModifiedTime).getTime() : null;
        if (exMs !== inMs) patch.drive_modified_time = driveModifiedTime;
        if (Object.keys(patch).length) {
          patch.updated_at = new Date().toISOString();
          await supabase.from("sops").update(patch).eq("id", ex.id);
          totalUpdated++;
        }
      } else {
        await supabase.from("sops").insert({
          org_id: orgUser.org_id,
          source: "org",
          title: baseTitle,
          drive_file_id: file.id,
          content_md: null,
          status: "active",
          created_by: orgUser.id,
          updated_by: orgUser.id,
          doc_id_external: docIdExternal,
          drive_modified_time: driveModifiedTime,
        });
        totalCreated++;
      }
    }

    for (const [driveId, sop] of sopsMap) {
      if (!driveFileIds.has(driveId) && sop.status !== "removed_from_drive") {
        await supabase.from("sops").update({ status: "removed_from_drive" }).eq("id", sop.id);
        totalRemoved++;
      }
    }

    const companyMap = COMPANY_TABLE_MAP[moduleType];
    if (companyMap) {
      const { data: existingCo } = await supabase
        .from(companyMap.table)
        .select(`id, drive_file_id, title, doc_id_external, drive_modified_time, is_active`)
        .eq("user_id", tokenRecord.user_id)
        .not("drive_file_id", "is", null);
      const coMap = new Map((existingCo || []).map((s: any) => [s.drive_file_id, s]));
      for (const file of driveFiles) {
        const baseTitle = file.name.replace(/\.[^/.]+$/, "");
        const parsed = parseDocIdExternal(file.name);
        const docIdExternal = parsed?.id ?? null;
        const driveModifiedTime = file.modifiedTime ?? null;
        const ex = coMap.get(file.id);
        if (ex) {
          const patch: any = {};
          if (ex.title !== baseTitle) patch.title = baseTitle;
          if (ex.doc_id_external !== docIdExternal) patch.doc_id_external = docIdExternal;
          if (!ex.is_active) patch.is_active = true;
          const exMs = ex.drive_modified_time ? new Date(ex.drive_modified_time).getTime() : null;
          const inMs = driveModifiedTime ? new Date(driveModifiedTime).getTime() : null;
          if (exMs !== inMs) patch.drive_modified_time = driveModifiedTime;
          if (Object.keys(patch).length) {
            await supabase.from(companyMap.table).update(patch).eq("id", ex.id);
          }
        } else {
          await supabase.from(companyMap.table).insert({
            user_id: tokenRecord.user_id,
            [companyMap.sourceKeyField]: file.id,
            title: baseTitle,
            content: moduleType === "sops" ? "" : null,
            drive_file_id: file.id,
            drive_folder_id: folderRecord.drive_folder_id,
            doc_id_external: docIdExternal,
            drive_modified_time: driveModifiedTime,
            is_active: true,
          });
        }
      }
      for (const [driveId, row] of coMap) {
        if (!driveFileIds.has(driveId) && row.is_active) {
          await supabase.from(companyMap.table).update({ is_active: false }).eq("id", row.id);
        }
      }
    }
  }

  return {
    org_id: orgUser.org_id,
    files_found: totalFound,
    created: totalCreated,
    updated: totalUpdated,
    removed: totalRemoved,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: tokens, error } = await supabase
      .from("user_drive_tokens")
      .select("*")
      .eq("is_active", true)
      .eq("is_primary", true);
    if (error) throw error;

    const summary: any[] = [];
    for (const token of tokens || []) {
      try {
        const result = await syncOrg(supabase, token);
        summary.push(result);
      } catch (e) {
        summary.push({
          org_id: token.org_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    await supabase.from("audit_logs").insert({
      user_id: tokens?.[0]?.user_id ?? "00000000-0000-0000-0000-000000000000",
      action: "drive_sync_cron",
      table_name: "sops",
      new_data: { summary, ran_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, orgs_processed: summary.length, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
