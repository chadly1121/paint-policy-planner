import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Calendar, Trash2, ZoomIn } from "lucide-react";

interface AwardCardProps {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  awardedDate: string | null;
  canEdit: boolean;
  onDelete: (id: string) => Promise<{ error: Error | null }>;
}

const AwardCard = ({
  id,
  title,
  description,
  imageUrl,
  awardedDate,
  canEdit,
  onDelete,
}: AwardCardProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(id);
    setDeleting(false);
  };

  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative aspect-video cursor-pointer group">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <img src={imageUrl} alt={title} className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {!imageUrl && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <h4 className="font-medium">{title}</h4>
              
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
              )}
              
              {awardedDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(awardedDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Award</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AwardCard;
