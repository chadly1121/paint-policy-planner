import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface SectionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  itemCount?: number;
}

const SectionCard = ({ title, description, icon: Icon, path, itemCount }: SectionCardProps) => {
  return (
    <Link to={path} className="group block">
      <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          <CardTitle className="font-serif text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {itemCount !== undefined && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
};

export default SectionCard;
