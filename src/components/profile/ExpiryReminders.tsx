import { differenceInDays, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Calendar } from "lucide-react";

interface Certificate {
  id: string;
  name: string;
  expiry_date: string | null;
}

interface ExpiryRemindersProps {
  certificates: Certificate[];
}

const ExpiryReminders = ({ certificates }: ExpiryRemindersProps) => {
  if (certificates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Certificate Renewal Reminder</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          The following certificates are expiring soon and need renewal:
        </p>
        <ul className="space-y-1">
          {certificates.map((cert) => {
            const expiryDate = new Date(cert.expiry_date!);
            const daysLeft = differenceInDays(expiryDate, new Date());
            
            return (
              <li key={cert.id} className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">{cert.name}</span>
                <span>—</span>
                <span>
                  {daysLeft <= 0 
                    ? "Expired!" 
                    : daysLeft === 1 
                      ? "Expires tomorrow" 
                      : `Expires in ${daysLeft} days (${format(expiryDate, "MMM d, yyyy")})`
                  }
                </span>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default ExpiryReminders;
