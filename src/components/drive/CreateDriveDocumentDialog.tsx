import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export type DriveFolderType = "sops" | "policies" | "safety" | "training" | "disciplinary" | "forms";

type Option = {
  value: DriveFolderType;
  label: string;
};

const OPTIONS: Option[] = [
  { value: "sops", label: "SOP" },
  { value: "policies", label: "Company Policy" },
  { value: "safety", label: "Safety Protocol" },
  { value: "training", label: "Training Requirement" },
  { value: "disciplinary", label: "Disciplinary Procedure" },
  { value: "forms", label: "Form" },
];

interface CreateDriveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderType: DriveFolderType;
  isCreating?: boolean;
  onCreate: (folderType: DriveFolderType) => Promise<void>;
}

export function CreateDriveDocumentDialog({
  open,
  onOpenChange,
  defaultFolderType,
  isCreating = false,
  onCreate,
}: CreateDriveDocumentDialogProps) {
  const [folderType, setFolderType] = useState<DriveFolderType>(defaultFolderType);

  useEffect(() => {
    if (open) setFolderType(defaultFolderType);
  }, [open, defaultFolderType]);

  const selectedLabel = useMemo(() => {
    return OPTIONS.find((o) => o.value === folderType)?.label ?? "Document";
  }, [folderType]);

  const handleCreate = async () => {
    await onCreate(folderType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isCreating && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new document</DialogTitle>
          <DialogDescription>
            Choose a document type. We’ll copy the matching template (or insert a starter outline) and auto-name it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">Document type</div>
          <Select value={folderType} onValueChange={(v) => setFolderType(v as DriveFolderType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>Create {selectedLabel}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
