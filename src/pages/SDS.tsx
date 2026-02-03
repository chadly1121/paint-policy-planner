import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, FileWarning, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSdsDocuments, HAZARD_CATEGORIES } from "@/hooks/useSdsDocuments";
import { SdsCard } from "@/components/sds/SdsCard";
import { AddSdsDialog } from "@/components/sds/AddSdsDialog";
import { useOrg } from "@/contexts/OrganizationContext";

const SDS = () => {
  const { t } = useTranslation();
  const { isOrgAdmin } = useOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const [hazardFilter, setHazardFilter] = useState("");

  const { documents, isLoading, deleteDocument } = useSdsDocuments({
    search: searchQuery,
    hazardCategory: hazardFilter,
  });

  const handleDelete = (id: string) => {
    deleteDocument.mutate(id);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setHazardFilter("");
  };

  const hasActiveFilters = searchQuery || hazardFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Safety Data Sheets</h1>
          <p className="mt-1 text-muted-foreground">
            Access and search material safety data sheets for products used on the job.
          </p>
        </div>
        {isOrgAdmin && <AddSdsDialog />}
      </div>

      {/* Safety Alert */}
      <Alert>
        <FileWarning className="h-4 w-4" />
        <AlertTitle>OSHA Requirement</AlertTitle>
        <AlertDescription>
          Safety Data Sheets must be readily accessible to employees during each work shift.
          Keep physical copies on job sites or ensure mobile access to this digital library.
        </AlertDescription>
      </Alert>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product name or manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={hazardFilter || "all"} onValueChange={(val) => setHazardFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Hazard type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hazards</SelectItem>
            {HAZARD_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileWarning className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No SDS documents found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Add your first Safety Data Sheet to get started."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <SdsCard key={doc.id} document={doc} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SDS;
