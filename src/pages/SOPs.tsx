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
    title: "SOP-008 – Driving, Transportation, Travel Time & Vehicle Use Policy (Ontario)",
    content: `PURPOSE
To establish clear, enforceable rules for travel time, clocking in and out, transportation, and company vehicle use. This policy complies with the Ontario Employment Standards Act (ESA).

1. LEGAL BASIS (ONTARIO ESA)
• Normal commuting time (home to first job site and last job site to home) is unpaid.
• Travel time is paid only when the employer directs or requires travel (job-to-job travel, shop visits, supply pickups).
• Employer-provided vehicles or fuel do not automatically make commuting paid time.

2. CORE RULES
• You are paid only when you are working.
• You clock in when you arrive at the job site.
• You clock in to the correct customer job.
• Nobody ever clocks in from home.
• GPS and geofencing are used to verify clock-ins.

3. CLOCK-IN PROCEDURES
• Clock in upon arrival at the job site.
• If working at the shop for a customer job: Clock in to the customer job and add note: "Working at shop"
• Do not clock in under "shop" unless explicitly instructed.

4. SHOP EXCEPTIONS (EMPLOYER-DIRECTED ONLY)
• If management instructs you to go to the shop and you are the driver: You may clock in at the shop for the customer job; shop-to-job travel is paid.
• Only the instructed driver clocks in.
• No other employees clock in at the shop.

5. PERSONAL CARPOOLING (UNPAID)
• Carpooling is a personal choice.
• Drivers do not get paid for driving coworkers.
• Personal carpooling does not convert travel into paid time.

6. RIDING WITH ANOTHER EMPLOYEE (UNPAID)
• Riders do not clock in at the shop.
• Riders do not load vehicles.
• Riders do not perform work.
• Receiving a ride is unpaid personal time.

7. PICKUPS, SUPPLIES & JOB-TO-JOB TRAVEL (PAID)
• If directed to go to the shop, paint store, pick up supplies, or pick up employees: Clock in at the first required work stop.
• Employer-directed travel during the workday is paid at regular rate (minimum wage or higher).

8. END OF DAY
• Clock out when work is complete.
• Travel home is unpaid.
• Applies to everyone, including foremen.

9. COMPANY VEHICLES (PERSONAL USE)
• Personal use is a privilege, not a right.
• Driving a company vehicle to the shop or job site is unpaid.
• Company-paid fuel for personal use is a bonus.
• If you disagree, the vehicle will be parked at the shop.

10. LIVING TOGETHER / ROOMMATE SITUATIONS
• Living together does not qualify for paid travel.
• Transporting roommates is not employer-directed work.
• Disputes will require employees to arrange their own transportation.

11. FOREMAN TRANSPORTATION & RIDE POLICY
• Foremen are not chauffeurs.
• The company will not pay for extra trips done for employee convenience.
• If a foreman is directed to go to the shop or supplier: He goes shop → job site. He does NOT return home to pick up coworkers.
• Roommates must be ready first thing or arrange their own transportation.

12. NO SMOKING OR VAPING IN COMPANY VEHICLES
• Smoking and vaping are strictly prohibited in all company vehicles.
• Includes cigarettes, cigars, vapes, and cannabis.
• Applies at all times, including personal use.
• Violations may result in: Loss of vehicle privileges, cleaning/detailing costs charged, disciplinary action up to termination.

13. COMPLIANCE & ENFORCEMENT
• GPS and geofence data verify clock-ins.
• Time theft, unauthorized detours, or manipulation will be corrected.
• Repeated abuse may result in loss of vehicle or ride privileges.

14. EMPLOYEE ACKNOWLEDGMENT
I acknowledge that I have read, understand, and agree to comply with this policy.
Employee Name: ____________________________
Signature: ________________________________
Date: ___________________
Supervisor Signature: _______________________`,
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
