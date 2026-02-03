import { ExternalLink, FileText, Calendar, Trash2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SdsDocument, HAZARD_CATEGORIES } from "@/hooks/useSdsDocuments";
import { useOrg } from "@/contexts/OrganizationContext";

interface SdsCardProps {
  document: SdsDocument;
  onDelete: (id: string) => void;
}

export function SdsCard({ document, onDelete }: SdsCardProps) {
  const { isOrgAdmin } = useOrg();

  const hazardInfo = HAZARD_CATEGORIES.find((h) => h.value === document.hazard_category);

  const handleOpenSds = () => {
    if (document.external_url) {
      window.open(document.external_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold leading-tight">
                {document.product_name}
              </CardTitle>
              {document.manufacturer && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {document.manufacturer}
                </p>
              )}
            </div>
          </div>
          {hazardInfo && (
            <Badge variant="outline" className="shrink-0">
              {hazardInfo.icon} {hazardInfo.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {document.revision_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Revised: {new Date(document.revision_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {document.notes && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{document.notes}</p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {document.external_url && (
            <Button size="sm" onClick={handleOpenSds}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View SDS
            </Button>
          )}
          
          {isOrgAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove SDS Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove "{document.product_name}" from your SDS library?
                    This action can be undone by an administrator.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(document.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
