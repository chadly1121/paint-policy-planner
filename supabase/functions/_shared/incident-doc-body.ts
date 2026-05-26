// Shared helper to build the Google Doc body for an incident report.
// Used by create-incident-report and regenerate-incident-doc to keep
// the Drive file in sync with the database record.

export interface IncidentRecord {
  id: string;
  incident_date: string;
  incident_time: string | null;
  location: string;
  description: string;
  severity: string;
  status: string;
  injuries_reported: boolean | null;
  injury_details: string | null;
  witnesses: string | null;
  immediate_actions: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_near_miss: boolean | null;
  created_at: string;
}

export interface IncidentAttachment {
  file_name: string;
  mime_type: string;
  size_bytes: number;
  drive_web_view_link: string;
}

export interface IncidentDocContext {
  reportNumber: number | string;
  reporterName: string;
  reporterEmail: string;
  reviewerName?: string | null;
}

export function buildIncidentDocBody(
  incident: IncidentRecord,
  attachments: IncidentAttachment[],
  ctx: IncidentDocContext,
): string {
  const hasAdminReview =
    !!(incident.root_cause || incident.corrective_actions || incident.review_notes);

  const adminReviewSection = hasAdminReview
    ? `\n───────────────────────────────────────────────────────────────\n\nADMIN REVIEW\n\nStatus: ${(incident.status || 'open').toUpperCase()}\n${ctx.reviewerName ? `Reviewed By: ${ctx.reviewerName}` : ''}\n${incident.reviewed_at ? `Review Date: ${new Date(incident.reviewed_at).toLocaleString()}` : ''}\n\nRoot Cause:\n${incident.root_cause || '(not provided)'}\n\nCorrective Actions:\n${incident.corrective_actions || '(not provided)'}\n\nReview Notes:\n${incident.review_notes || '(none)'}\n`
    : '';

  const attachmentsSection = attachments.length
    ? `\n───────────────────────────────────────────────────────────────\n\nATTACHMENTS (${attachments.length})\n\n${attachments
  .map(
    (a, i) =>
      `${i + 1}. ${a.file_name} (${a.mime_type}, ${(a.size_bytes / 1024).toFixed(1)} KB)\n   Link: ${a.drive_web_view_link}`,
  )
  .join('\n\n')}\n`
    : '';

  return `INCIDENT REPORT\n═══════════════════════════════════════════════════════════════\n\nReport Number: IR-${ctx.reportNumber}\nDate Filed: ${new Date(incident.created_at).toLocaleDateString()}\nStatus: ${(incident.status || 'open').toUpperCase()}\n\n───────────────────────────────────────────────────────────────\n\nINCIDENT DETAILS\n\nDate of Incident: ${incident.incident_date}\nTime of Incident: ${incident.incident_time || 'Not specified'}\nLocation: ${incident.location}\nSeverity: ${(incident.severity || 'minor').toUpperCase()}\nNear Miss: ${incident.is_near_miss ? 'YES' : 'No'}\n\nReported By: ${ctx.reporterName}\nReporter Email: ${ctx.reporterEmail}\n\n───────────────────────────────────────────────────────────────\n\nDESCRIPTION OF INCIDENT\n\n${incident.description}\n\n───────────────────────────────────────────────────────────────\n\nINJURIES\n\nInjuries Reported: ${incident.injuries_reported ? 'YES' : 'No'}\n${incident.injury_details ? `Injury Details: ${incident.injury_details}` : ''}\n\n───────────────────────────────────────────────────────────────\n\nWITNESSES\n\n${incident.witnesses || 'None listed'}\n\n───────────────────────────────────────────────────────────────\n\nIMMEDIATE ACTIONS TAKEN\n\n${incident.immediate_actions || 'None documented'}\n${adminReviewSection}${attachmentsSection}───────────────────────────────────────────────────────────────\n`;
}

// Shared Drive token decryption helper, replicated here so callers
// don't need to copy paste it into every function.
export async function decryptDriveToken(
  encryptedToken: string,
  encryptionKey: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const combined = Uint8Array.from(atob(encryptedToken), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encrypted,
  );

  return decoder.decode(decrypted);
}
