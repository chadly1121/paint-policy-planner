import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useSdsDocuments, HAZARD_CATEGORIES } from "@/hooks/useSdsDocuments";

export function AddSdsDialog() {
  const [open, setOpen] = useState(false);
  const { addDocument } = useSdsDocuments();

  const [formData, setFormData] = useState({
    product_name: "",
    manufacturer: "",
    hazard_category: "",
    external_url: "",
    revision_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addDocument.mutateAsync({
      product_name: formData.product_name,
      manufacturer: formData.manufacturer || null,
      hazard_category: formData.hazard_category || null,
      drive_file_id: null,
      external_url: formData.external_url || null,
      revision_date: formData.revision_date || null,
      notes: formData.notes || null,
    });

    setFormData({
      product_name: "",
      manufacturer: "",
      hazard_category: "",
      external_url: "",
      revision_date: "",
      notes: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add SDS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Safety Data Sheet</DialogTitle>
            <DialogDescription>
              Add a new SDS document to your organization's library.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g., Latex Paint - Eggshell White"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Sherwin-Williams"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hazard_category">Hazard Category</Label>
              <Select
                value={formData.hazard_category}
                onValueChange={(value) => setFormData({ ...formData, hazard_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hazard type" />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="external_url">SDS Link (URL)</Label>
              <Input
                id="external_url"
                type="url"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://manufacturer.com/sds/product.pdf"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="revision_date">Revision Date</Label>
              <Input
                id="revision_date"
                type="date"
                value={formData.revision_date}
                onChange={(e) => setFormData({ ...formData, revision_date: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this product..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addDocument.isPending || !formData.product_name}>
              {addDocument.isPending ? "Adding..." : "Add SDS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
