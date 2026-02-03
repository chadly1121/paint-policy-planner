import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRedemptionItems, RedemptionItem } from "@/hooks/useRedemptionItems";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Gift, 
  Loader2, 
  ImageIcon,
  Coins
} from "lucide-react";

const RedemptionItemsManager = () => {
  const { toast } = useToast();
  const { items, loading, createItem, updateItem, deleteItem, refresh } = useRedemptionItems();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RedemptionItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsRequired("");
    setImageUrl("");
    setIsActive(true);
    setEditingItem(null);
  };

  const openEditDialog = (item: RedemptionItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPointsRequired(item.points_required.toString());
    setImageUrl(item.image_url || "");
    setIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const points = parseInt(pointsRequired);
    if (isNaN(points) || points <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid points",
        description: "Points required must be a positive number",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter an item name",
      });
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        name: name.trim(),
        description: description.trim() || null,
        points_required: points,
        image_url: imageUrl.trim() || null,
        is_active: isActive,
      };

      if (editingItem) {
        const { error } = await updateItem(editingItem.id, itemData);
        if (error) throw error;
        toast({
          title: "Item updated",
          description: `"${name}" has been updated successfully.`,
        });
      } else {
        const { error } = await createItem(itemData);
        if (error) throw error;
        toast({
          title: "Item created",
          description: `"${name}" has been added to the rewards catalog.`,
        });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: RedemptionItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const { error } = await deleteItem(item.id);
      if (error) throw error;
      toast({
        title: "Item deleted",
        description: `"${item.name}" has been removed.`,
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "This item may have pending redemption requests.",
      });
    }
  };

  const toggleActive = async (item: RedemptionItem) => {
    try {
      const { error } = await updateItem(item.id, { is_active: !item.is_active });
      if (error) throw error;
      toast({
        title: item.is_active ? "Item deactivated" : "Item activated",
        description: `"${item.name}" is now ${item.is_active ? "hidden from" : "visible to"} employees.`,
      });
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Items
              <Badge variant="secondary">{items.filter(i => i.is_active).length} active</Badge>
            </CardTitle>
            <CardDescription>
              Manage the rewards employees can redeem with their points
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Reward Item" : "Add New Reward Item"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? "Update the details of this reward item."
                    : "Create a new reward that employees can redeem."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., $25 Amazon Gift Card"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description of the reward..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Points Required *
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    value={pointsRequired}
                    onChange={(e) => setPointsRequired(e.target.value)}
                    placeholder="e.g., 500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Image URL (optional)
                  </Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                  {imageUrl && (
                    <div className="mt-2 p-2 border rounded-md">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="h-16 w-16 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Available for redemption</Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Save Changes" : "Create Item"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No reward items yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first reward to get started
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Coins className="h-4 w-4" />
                      Points
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="h-10 w-10 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <Gift className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {item.points_required.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => toggleActive(item)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionItemsManager;
