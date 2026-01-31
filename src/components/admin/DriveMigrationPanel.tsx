// Bulk migration panel for exporting legacy documents to Google Drive
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, CloudUpload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MigrationResult {
  table: string;
  id: string;
  title: string;
  success: boolean;
  driveFileId?: string;
  error?: string;
}

interface MigrationSummary {
  total: number;
  success: number;
  failed: number;
  already_migrated: number;
  newly_migrated: number;
}

const MODULE_OPTIONS = [
  { id: 'sops', label: 'SOPs', description: 'Standard Operating Procedures' },
  { id: 'policies', label: 'Policies', description: 'Company Policies' },
  { id: 'safety', label: 'Safety', description: 'Safety Protocols' },
  { id: 'training', label: 'Training', description: 'Training Materials' },
  { id: 'disciplinary', label: 'Disciplinary', description: 'Disciplinary Procedures' },
];

interface DriveMigrationPanelProps {
  isConnected: boolean;
  hasFolders: boolean;
}

export default function DriveMigrationPanel({ isConnected, hasFolders }: DriveMigrationPanelProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>(['sops', 'policies', 'safety', 'training', 'disciplinary']);
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [results, setResults] = useState<MigrationResult[] | null>(null);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const runMigration = async () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module type");
      return;
    }

    setIsLoading(true);
    setResults(null);
    setSummary(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke('drive-bulk-export', {
        body: {
          module_types: selectedModules,
          dry_run: isDryRun,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results);
      setSummary(data.summary);

      if (isDryRun) {
        toast.success(`Dry run complete: ${data.summary.total} documents would be migrated`);
      } else {
        toast.success(`Migration complete: ${data.summary.newly_migrated} documents exported to Drive`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error(error instanceof Error ? error.message : 'Migration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CloudUpload className="h-5 w-5" />
            Export to Google Drive
          </CardTitle>
          <CardDescription>
            Connect Google Drive first to enable document migration.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasFolders) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CloudUpload className="h-5 w-5" />
            Export to Google Drive
          </CardTitle>
          <CardDescription>
            Please create Drive folders first before migrating documents.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CloudUpload className="h-5 w-5 text-primary" />
          Export Legacy Documents to Google Drive
        </CardTitle>
        <CardDescription>
          Migrate existing documents to Google Drive as Google Docs. After migration, 
          Drive becomes the source of truth for all documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Module Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Select modules to migrate:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MODULE_OPTIONS.map(module => (
              <label
                key={module.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModules.includes(module.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Checkbox
                  checked={selectedModules.includes(module.id)}
                  onCheckedChange={() => toggleModule(module.id)}
                />
                <div>
                  <p className="text-sm font-medium">{module.label}</p>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Dry Run Option */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <Checkbox
            id="dry-run"
            checked={isDryRun}
            onCheckedChange={(checked) => setIsDryRun(checked === true)}
          />
          <label htmlFor="dry-run" className="cursor-pointer">
            <p className="text-sm font-medium">Dry Run (Preview Only)</p>
            <p className="text-xs text-muted-foreground">
              Preview which documents would be migrated without making changes
            </p>
          </label>
        </div>

        {/* Action Button */}
        <Button 
          onClick={runMigration} 
          disabled={isLoading || selectedModules.length === 0}
          className="w-full"
          variant={isDryRun ? "outline" : "default"}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isDryRun ? 'Scanning...' : 'Migrating...'}
            </>
          ) : (
            <>
              <CloudUpload className="mr-2 h-4 w-4" />
              {isDryRun ? 'Preview Migration' : 'Start Migration'}
            </>
          )}
        </Button>

        {/* Results */}
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-center">
                <p className="text-2xl font-bold text-success">{summary.success}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">{summary.already_migrated}</p>
                <p className="text-xs text-muted-foreground">Already in Drive</p>
              </div>
              {summary.failed > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 text-center">
                  <p className="text-2xl font-bold text-destructive">{summary.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              )}
            </div>

            {/* Progress */}
            {summary.total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Migration Progress</span>
                  <span>{Math.round((summary.success / summary.total) * 100)}%</span>
                </div>
                <Progress value={(summary.success / summary.total) * 100} className="h-2" />
              </div>
            )}

            {/* Detailed Results */}
            {results && results.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Documents:</h4>
                <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border p-2">
                  {results.map((result, idx) => (
                    <div 
                      key={`${result.table}-${result.id}-${idx}`}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        result.success ? 'bg-success/5' : 'bg-destructive/5'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{result.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {result.table.replace('company_', '')}
                      </Badge>
                      {result.driveFileId && (
                        <Badge variant="secondary" className="text-xs">
                          In Drive
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Step */}
            {isDryRun && summary.total > 0 && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm">
                  <strong>Ready to migrate?</strong> Uncheck "Dry Run" and click "Start Migration" 
                  to export {summary.total - summary.already_migrated} documents to Google Drive.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
