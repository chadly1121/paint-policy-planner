import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const sopItems = [
  {
    id: "sop-001",
    title: "SOP-001 – Priming a New Construction House",
    content: `PURPOSE
To establish a consistent, efficient, and high-quality process for priming drywall in new construction homes.

NON-NEGOTIABLES
• We DO NOT brush bare drywall. Ever.
• Walls are rolled first. No cutting first.
• All belongings, windows, fixtures, and hardware must be protected.
• Safety check occurs before work begins.

PROCEDURE

1. Safety & Site Readiness
• Confirm site is safe and free of hazards.
• Confirm ventilation if spraying.
• Protect windows, hinges, countertops, fixtures, floors, and non-painted surfaces.

2. Wall Priming
• Roll all walls with drywall primer.
• Do not cut first.
• Maintain wet edge and even coverage.

3. Ceiling Priming
Option A – Spray & Back-Roll (Preferred):
• Spray ceilings evenly.
• Back-roll with 20 mil roller.
• Spray all corners and angles normally brushed.

Option B – Roll + Spray Corners:
• Roll ceilings with 20 mil roller.
• Spray all vertical and horizontal corners afterward.

FINAL CHECK
• No missed areas.
• No overspray.
• Uniform primer coverage.`,
  },
  {
    id: "sop-002",
    title: "SOP-002 – Painting Ceilings (New Construction, Primed)",
    content: `PURPOSE
To produce a finished ceiling surface using spray and back-roll with minimal coats.

NON-NEGOTIABLES
• All drywall must be sanded.
• Spray and back-roll only.
• 20 mil roller only.
• Protection is mandatory.

PROCEDURE
1. Sand ceilings and remove dust.
2. Protect windows, walls, fixtures, and floors.
3. Spray ceilings evenly.
4. Back-roll immediately with 20 mil roller.
5. Aim for one-coat finish; second coat only if required.`,
  },
  {
    id: "sop-003",
    title: "SOP-003 – Interior Painting Sequence (New Construction)",
    content: `MANDATORY ORDER
1. Prime walls and ceilings
2. Paint ceilings
3. Paint walls
4. Paint trim, doors, and frames

RULES
• No out-of-sequence work.
• Each stage must be inspected before proceeding.`,
  },
  {
    id: "sop-004",
    title: "SOP-004 – Painting Walls (Post-Ceiling)",
    content: `NON-NEGOTIABLES
• Ceilings must be complete.
• Protection remains in place.
• No free-styling application methods.

PROCEDURE
• Inspect walls for damage; patch and spot-prime as needed.
• Option A: Spray and back-roll (12–15 mil).
• Option B: Roll only when spraying is not approved.
• One full coat minimum; second coat if required.`,
  },
  {
    id: "sop-005",
    title: "SOP-005 – Bathroom & Facility Use Policy",
    content: `GENERAL POLICY
• Employees are strictly prohibited from using customer bathrooms, sinks, tubs, or drains.
• No exceptions.

BATHROOM BREAK SCHEDULE
• Approved break times: 10:00 AM, 12:00 PM, 2:00 PM.
• Use public or approved facilities only.

PROHIBITED PRACTICES
• No outdoor urination (bushes, woods, vehicles).
• No flushing wipes, feminine products, paper towels.
• Only toilet paper in toilets.

DISCIPLINE
• First offense: written warning.
• Repeat offenses: suspension or termination.`,
  },
  {
    id: "sop-006",
    title: "SOP-006 – Equipment Storage & Vehicle Use",
    content: `POLICY
• Vehicles are mobile storage units.
• Only bring tools needed for the task.
• Do not unload full vehicles into job sites.
• No tools left on site overnight (except labeled paint and tray liners).

END OF DAY
• Tools returned to vehicle or shop.
• Vehicles locked.`,
  },
  {
    id: "sop-007",
    title: "SOP-007 – Equipment Sign-Out & Sundries Tracking",
    content: `EQUIPMENT
• All tools must be signed out.
• Condition logged out and in.
• Missing/damaged tools reported immediately.

SUNDRIES
• All consumables logged when taken from shop.
• Weekly review and monthly audits.`,
  },
  {
    id: "sop-008",
    title: "SOP-008 – Driving, Transportation, Travel Time & Vehicle Use (Ontario)",
    content: `LEGAL BASIS
• Commuting is unpaid.
• Employer-directed travel is paid.
• Company vehicles/fuel do not make commuting paid.

CORE RULES
• Clock in at job site only.
• Never clock in from home.
• GPS/geofence enforced.

SHOP EXCEPTIONS
• Only instructed driver clocks in at shop.
• Shop-to-job travel is paid.

CARPOOLING
• Personal choice.
• Driver not paid.
• Riders do not work or load vehicles.

PICKUPS
• Employer-directed pickups are paid.
• Clock in at first required stop.

END OF DAY
• Clock out when work ends.
• Travel home unpaid.

COMPANY VEHICLES
• Personal use is a privilege.
• No paid commuting.
• Fuel for personal use is a bonus.

ROOMMATES
• Living together does not create paid travel.
• Disputes require personal transportation.

FOREMAN RIDE POLICY
• Foremen are not chauffeurs.
• No paid extra trips for employee convenience.
• Shop → Job only when directed.

NO SMOKING OR VAPING
• No smoking or vaping in company vehicles.
• Applies at all times.
• Violations result in loss of privileges and discipline.`,
  },
  {
    id: "sop-009",
    title: "SOP-009 – Vacuum Use, Dust Control & Safety",
    content: `PURPOSE
To establish safe, effective, and professional procedures for the use, maintenance, cleaning, storage, and selection of vacuum systems on job sites and in the shop. This SOP ensures dust is captured at the source, health risks are minimized, and equipment is preserved.

GENERAL POLICY
• Always use a vacuum with an appropriate filter and a filter bag when vacuuming dry debris, dust, or fine particles.
• Vacuuming without a filter or bag is prohibited except for specific wet applications.

EQUIPMENT SELECTION
• Use the correct vacuum for the task:
  – Large construction vacuums (e.g., Festool or HEPA-equipped units) are for sanding drywall and other heavy dust-generating tasks.
  – Smaller shop vacs may be used for light cleanup and non-hazardous debris.
• Do not use a standard shop vacuum for fine drywall dust or hazardous dust without a proper HEPA-rated filter.

FILTERS & BAGS
• A vacuum must always have:
  – An intact filter (correct type for the material)
  – A filter bag installed
• Never operate dry vacuum equipment without both a filter and a bag installed.
• Exception: When vacuuming water or liquids, remove the dry-use bag and filter. After wet use, clean, dry, and reinstall the appropriate dry dust filter and bag for normal vacuuming.

REUSABLE COMPONENTS
• If the vacuum has reusable bags or reusable filters:
  – Do not throw them out after one use.
  – Properly clean or replace them per manufacturer instructions.
• Reusable filters should last for years if cleaned and maintained after each use.

SAFETY & DUST CONTROL
• Dust generated from sanding, grinding, or cutting can contain respirable particles (silica, wood dust, gypsum, etc.) that are harmful when inhaled.
• For tasks generating fine dust, use HEPA-rated vacuums that capture particles as small as 0.3 microns.
• Whenever possible, attach the vacuum directly to the tool generating dust (e.g., sander or grinder) to capture dust at the source.
• Never use compressed air to blow dust off surfaces — always vacuum with the appropriate filter or use wet methods.

FILTER EFFICIENCY & HEALTH
• For jobs with heavy dust or silica exposure, HEPA-rated filters (99.97% efficiency or better) are recommended for maximum capture of fine particulates.
• Use appropriate PPE — respirators, eye protection — when vacuuming fine dust even with a proper filter.

CLEANING & MAINTENANCE
• After each use:
  – Empty or replace the bag if full.
  – Inspect the filter for damage or clogging.
  – Clean reusable filters per manufacturer instructions.
• Dispose of collected fine dust in sealed bags and in accordance with local waste regulations.

HOSE & ACCESSORY CARE
• Always store hoses and attachments with the vacuum or in a designated clean storage area.
• Do not leave hoses, nozzles, or accessories scattered where they can be damaged.
• Keep hoses free of kinks and inspect them regularly for holes or wear.

STORAGE
• Store vacuums in a clean, dry area — inside a job trailer or shop cabinet.
• Protect vacuums from moisture, rain, and direct sunlight when stored on site.
• Label vacuum systems with identification and filter type.

JOBSITE HOUSEKEEPING
• Use the vacuum to remove dust and debris regularly during work, not only at the end of the day.
• For fine dust work (drywall sanding, joint compound dust), vacuum often to reduce airborne particles and cleanup time.
• When working in customer homes, ensure thorough vacuum cleaning before removal of protective coverings to avoid spreading dust.

SAFETY CONSIDERATIONS
• Do not operate vacuum equipment if electrical cords or plugs are damaged.
• If vacuuming combustible dust (e.g., fine wood dust in large quantities), ensure the unit is rated safe for the application and static discharge is controlled.
• Never vacuum hazardous materials (e.g., asbestos, lead paint dust) unless using a certified vacuum with HEPA filtration appropriate for that hazard and in accordance with specialized regulations.

TRAINING
• Employees must be trained on:
  – Correct vacuum selection
  – Filter and bag installation
  – Cleaning and maintenance
  – Health risks associated with airborne dust

ENFORCEMENT
• Operating vacuums without the proper bag and filter is prohibited.
• Misuse, damage, or neglect will result in discipline and may require the employee to replace or repair equipment.`,
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
