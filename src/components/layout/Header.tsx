import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  title: string;
}

const Header = ({ isSidebarOpen, onToggleSidebar, title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onToggleSidebar}
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <h1 className="font-serif text-xl font-semibold text-foreground">
          {title}
        </h1>
      </div>
    </header>
  );
};

export default Header;
