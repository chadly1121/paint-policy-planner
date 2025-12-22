import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const sopItems = [
  {
    id: "sop-1",
    title: "1. Job Site Preparation",
    content: `Before beginning any painting job, complete the following steps:
1. Conduct a walkthrough with the customer to confirm work areas and colors
2. Protect all floors, furniture, and fixtures with drop cloths and plastic sheeting
3. Remove outlet covers, light switch plates, and hardware
4. Clean all surfaces to be painted - remove dust, dirt, and cobwebs
5. Fill holes and cracks with appropriate filler and sand smooth
6. Apply painter's tape to edges, trim, and any areas not being painted
7. Take before photos for documentation`,
  },
  {
    id: "sop-2",
    title: "2. Surface Preparation & Priming",
    content: `Proper surface prep ensures quality results:
1. Sand glossy surfaces to promote adhesion
2. Scrape and remove any loose or peeling paint
3. Wash walls with TSP solution for kitchens/bathrooms or areas with heavy grime
4. Allow all surfaces to dry completely before priming
5. Apply primer to all bare wood, patched areas, and stained surfaces
6. Use stain-blocking primer for water stains or tannin bleed
7. Allow primer to dry according to manufacturer specifications`,
  },
  {
    id: "sop-3",
    title: "3. Interior Painting Procedure",
    content: `Follow this sequence for interior painting:
1. Start with the ceiling - cut in edges first, then roll
2. Paint trim, doors, and windows next
3. Paint walls last - cut in all edges and corners
4. Roll walls using W-pattern for even coverage
5. Apply thin, even coats - two coats minimum
6. Allow proper dry time between coats (check product specifications)
7. Remove tape while paint is still slightly tacky
8. Touch up as needed after final coat dries`,
  },
  {
    id: "sop-4",
    title: "4. Exterior Painting Procedure",
    content: `Exterior painting requires weather consideration:
1. Check weather forecast - no rain for 24 hours minimum
2. Do not paint in direct sunlight or temperatures below 50°F or above 90°F
3. Power wash all surfaces and allow 48 hours to dry
4. Scrape, sand, and prime all bare or damaged areas
5. Caulk gaps around windows, doors, and trim
6. Paint in the shade when possible - follow the sun around the house
7. Use exterior-grade paint and primer only
8. Apply two coats for complete coverage and durability`,
  },
  {
    id: "sop-5",
    title: "5. Equipment Care & Maintenance",
    content: `Maintain all equipment properly:
1. Clean brushes and rollers immediately after use
2. Use appropriate cleaner (water for latex, solvent for oil-based)
3. Store brushes hanging or lying flat - never on bristle ends
4. Clean spray equipment thoroughly after each use
5. Inspect ladders and scaffolding before each job
6. Report any damaged or worn equipment immediately
7. Store all equipment in designated areas when not in use`,
  },
  {
    id: "sop-6",
    title: "6. Color Matching & Custom Mixing",
    content: `For color matching jobs:
1. Obtain sample of existing color - chip at least quarter-sized
2. Use spectrophotometer when available for accurate matching
3. Test match on hidden area before proceeding
4. Mix adequate quantity for entire job plus 10% extra
5. Keep detailed records of custom formulas
6. Label all custom-mixed paint with job name and formula
7. Provide customer with color information for future touch-ups`,
  },
  {
    id: "sop-7",
    title: "7. Job Site Cleanup",
    content: `Complete cleanup before leaving any job:
1. Remove all tape carefully
2. Perform touch-ups as needed
3. Clean any paint drips or spills immediately
4. Remove all drop cloths and protective materials
5. Reinstall all outlet covers, switch plates, and hardware
6. Vacuum or sweep all work areas
7. Take after photos for documentation
8. Conduct final walkthrough with customer
9. Collect signature on completion form`,
  },
  {
    id: "sop-8",
    title: "8. Material Storage & Handling",
    content: `Proper material handling prevents waste and accidents:
1. Store paint in temperature-controlled environment (50-80°F)
2. Keep all containers sealed when not in use
3. Rotate stock - use oldest materials first
4. Never pour unused paint back into original container
5. Dispose of materials according to local regulations
6. Keep SDS sheets accessible for all products
7. Store flammable materials in approved cabinets
8. Check expiration dates before use`,
  },
];

const SOPs = () => {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">Standard Operating Procedures</CardTitle>
              <CardDescription>
                Step-by-step guides for completing painting tasks correctly and consistently
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PolicySection items={sopItems} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SOPs;
