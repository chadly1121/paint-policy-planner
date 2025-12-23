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
  {
    id: "sop-010",
    title: "SOP-010 – Orbital & Sheet Sander Use, Paper Selection, Cleaning & Storage",
    content: `PURPOSE
To ensure high-quality finishes, effective dust extraction, long tool life, and safe operation of orbital and sheet sanders. This SOP defines mandatory rules for sandpaper selection, use, maintenance, and storage.

NON-NEGOTIABLES
• Always use the correct brand of sandpaper with the matching sander.
• Festool sandpaper is used ONLY on Festool sanders.
• Generic sandpaper is used ONLY on generic sanders.
• Sandpaper holes MUST align with the sander pad holes.
• Sanders MUST be connected to a vacuum or dust collection system when required.
• Sanders and all parts MUST be stored in their proper bag or box.
• Never store used, worn, or dirty sandpaper in the sander storage container.
• These rules are non-negotiable.

SANDPAPER SELECTION
• Use only sandpaper designed for the specific sander brand and model.
• Hole patterns must line up exactly with the sanding pad.
  – Misaligned holes prevent dust extraction.
  – Poor dust extraction causes:
    - Surface scratching
    - Clogged paper
    - Excess airborne dust
    - Premature tool wear
• Always use the correct grit for the task:
  – Coarse grits for leveling and heavy material removal
  – Medium grits for general prep
  – Fine grits for finish sanding
• If unsure which grit to use, STOP and contact Chad or a Foreman.

PROPER SANDING PRACTICES
• Always keep sandpaper clean and free of debris.
• Stop immediately if paper becomes clogged or contaminated.
• Never continue sanding with dirty paper — dirty paper WILL scratch the surface.
• Do not press hard on the sander — let the tool and paper do the work.
• Keep the sander flat on the surface at all times.
• Lift the sander off the surface before stopping to avoid swirl marks.

DUST CONTROL & SAFETY
• Always connect orbital and sheet sanders to an appropriate vacuum or dust extractor when required.
• Dust extraction is critical for:
  – Surface quality
  – Worker health
  – Jobsite cleanliness
• Fine dust (drywall, wood, coatings) is a respiratory hazard.
• Wear appropriate PPE when sanding:
  – Dust mask or respirator
  – Eye protection
• Never use compressed air to blow dust off sanders or surfaces.

CLEANING & DAILY MAINTENANCE
After each use:
• Remove sandpaper and discard if worn or dirty.
• Inspect sanding pad for damage or buildup.
• Wipe down the sander body and vents.
• Check power cord for cuts, wear, or strain.
• Ensure dust ports are clear and unobstructed.

Sandpaper:
• Do not reuse sandpaper that is worn, clogged, torn, or contaminated.
• Never place used sandpaper back into storage containers.

INSPECTION & TOOL CARE
• Inspect sanders regularly for:
  – Loose pads
  – Damaged cords
  – Cracked housings
  – Excessive vibration
• Remove damaged sanders from service immediately.
• Report issues to a Foreman or Chad.

STORAGE (NON-NEGOTIABLE)
• Every sander must be stored:
  – In its designated bag or case
  – With its power cord properly wrapped
  – With accessories stored correctly
• NEVER:
  – Throw sanders loose into vans
  – Store sanders without their case
  – Store used or dirty sandpaper in the case
• Storage containers must remain clean and professional at all times.

ENFORCEMENT
• Failure to follow this SOP will result in corrective action.
• Damage caused by misuse, poor maintenance, or improper storage may result in:
  – Loss of tool privileges
  – Disciplinary action
  – Responsibility for repair or replacement`,
  },
  {
    id: "sop-011",
    title: "SOP-011 – General Tool Maintenance, Cleaning, Inspection & Storage",
    content: `PURPOSE
To ensure all tools used by the company are clean, safe, functional, and ready for use at all times. Proper maintenance extends tool life, improves work quality, prevents delays, and reduces safety risks.

This SOP applies to ALL tools including (but not limited to):
• Rollers, brushes, trays
• Sanders, vacuums, sprayers
• Hand tools, extension poles
• Electric and mechanical equipment
• Cleaning tools and accessories

CORE RULES (NON-NEGOTIABLE)
• All tools must be cleaned after use.
• All tools must be inspected before use.
• All tools must be stored properly.
• Employees must arrive at work with clean, ready-to-use tools.
• Damaged or unsafe tools must not be used.
• Failure to maintain tools may result in discipline.

DAILY TOOL CLEANING – END OF USE

Roller Cages & Frames:
• Clean immediately after use.
• Remove all wet paint.
• If paint dries on a cage, it must be fully scraped and cleaned before reuse.
• Rollers must spin freely and be paint-free.

Roller Covers:
• Wash thoroughly until water runs clear.
• Spin out excess water.
• Allow to dry fully before storage.
• Dispose of worn or damaged covers.

Brushes:
• Clean brushes daily.
• Remove all paint from bristles and ferrule.
• Shape bristles properly before drying.
• Store hanging or flat to maintain shape.
• Employees must arrive to work with clean brushes.

Trays, Buckets & Liners:
• Remove and dispose of used liners properly.
• Clean trays and buckets before storing.
• No dried paint buildup allowed.

ELECTRIC & MECHANICAL TOOL CLEANING
After each use:
• Wipe down exterior surfaces.
• Remove dust, debris, or paint splatter.
• Clear vents and air intakes.
• Empty and clean filters or bags (where applicable).

Tools include:
• Sanders
• Vacuums
• Sprayers
• Mixers
• Pressure washers

DAILY INSPECTION – BEFORE USE
Before using any tool, inspect for:

Electric Tools:
• Power cord cuts, frays, exposed wires
• Loose plugs or strain relief damage
• Cracked housings
• Excessive vibration
• Proper switch operation

Mechanical Tools:
• Loose bolts or fittings
• Leaks (air, paint, fluid)
• Abnormal noise
• Worn or damaged parts

Hand Tools:
• Cracks in handles
• Loose heads
• Excessive wear

If any defect is found:
• DO NOT USE the tool
• Tag it out of service
• Report immediately to a Foreman or Chad

WEEKLY & PERIODIC MAINTENANCE
• Deep clean frequently used tools weekly.
• Lubricate moving parts as required.
• Replace worn rollers, brushes, filters, hoses, tips, or pads.
• Check calibration where applicable (sprayers, pressure equipment).
• Shop manager or foreman conducts spot inspections.

STORAGE (NON-NEGOTIABLE)
• All tools must be stored clean and dry.
• Store tools in designated bins, racks, bags, or cases.
• Electric tools must be stored with cords wrapped properly.
• Do not throw tools loose into vans or job sites.
• Tool cases and storage containers must remain clean and professional.

Never:
• Store dirty tools
• Store wet tools
• Store damaged tools
• Mix clean and dirty tools together

TRANSPORTATION
• Secure tools during transport to prevent damage.
• Heavier tools secured first.
• No tools rolling loose in vehicles.

REPORTING & ACCOUNTABILITY
• Employees are responsible for the tools they use.
• Damage due to neglect or misuse must be reported immediately.
• Repeated failure to maintain tools may result in:
  – Loss of tool privileges
  – Disciplinary action
  – Responsibility for repair or replacement

SAFETY
• Clean tools reduce injury risk.
• Damaged cords and tools increase shock and fire hazards.
• Dust buildup increases respiratory risk.
• Proper maintenance is a safety requirement, not optional.`,
  },
  {
    id: "sop-012",
    title: "SOP-012 – Paint Sprayer Use, Cleaning, Maintenance & Tip Management",
    content: `PURPOSE
To ensure all paint sprayers are used correctly, cleaned thoroughly, maintained properly, and stored safely. Proper sprayer care prevents failures, protects finish quality, reduces costly repairs, and ensures readiness for the next job.

This SOP applies to:
• Airless sprayers
• Pumps
• Spray guns
• Hoses
• Tips, guards, and filters

CORE RULES (NON-NEGOTIABLE)
• Sprayers must be cleaned after EVERY use.
• No sprayer is left dirty overnight.
• Tips, filters, and guns must be cleaned immediately.
• Sprayers must be flushed properly before storage.
• Damage caused by improper cleaning or neglect is not acceptable.

PRE-USE INSPECTION (BEFORE EVERY USE)
Inspect the following before spraying:

Sprayer Unit:
• No leaks
• No abnormal noises
• Proper pressure response
• Clean intake screen

Hoses:
• No cuts, bubbles, kinks, or soft spots
• Proper fittings, tight connections

Gun & Guard:
• Trigger functions properly
• Guard installed correctly
• No paint buildup affecting spray pattern

Filters:
• Correct filter installed for material
• Clean and undamaged

If any issue is found:
• DO NOT USE the sprayer
• Notify a Foreman or Chad immediately

TIP SELECTION & USE
• Use the correct tip size for:
  – Material type
  – Viscosity
  – Surface being sprayed
• Never force material through an incorrect tip.
• Do not spray with a worn or damaged tip.

Rules:
• Tips are consumables.
• If a tip sprays unevenly or tails, replace it.
• Tips must be cleaned after every use.

DURING SPRAYING
• Maintain consistent distance and speed.
• Do not over-pressurize to compensate for clogs.
• Stop immediately if pattern degrades.
• Do not let material sit in the gun during breaks.

CLEANING PROCEDURE (MANDATORY)
Immediately after use:

Step 1 – Empty Material:
• Remove remaining paint from hopper or bucket.
• Return usable paint to labeled container.

Step 2 – Flush System:
• Flush with appropriate cleaner:
  – Water for water-based coatings
  – Solvent for solvent-based coatings
• Flush until fluid runs completely clear.

Step 3 – Gun, Tip & Filter Cleaning:
• Remove spray tip and guard.
• Clean thoroughly with brush and cleaner.
• Remove and clean gun filter.
• Remove and clean pump filter and intake screen.

Step 4 – Final Flush:
• Reassemble gun without tip.
• Flush clean fluid through system.
• Relieve pressure properly.

STORAGE (NON-NEGOTIABLE)
• Store sprayers clean and dry.
• Use pump protectant or storage fluid as required.
• Coil hoses properly—no kinks.
• Store tips, filters, and guards in labeled containers.
• Never store sprayers with paint inside.

COLD WEATHER PROTECTION
• Sprayers must be winterized in cold conditions.
• Never allow water to freeze inside pumps or hoses.
• Damage from freezing is preventable and unacceptable.

TRANSPORTATION
• Secure sprayers upright during transport.
• Do not stack heavy items on sprayers.
• Protect controls, gauges, and fittings.

ACCOUNTABILITY
• The last person to use the sprayer is responsible for cleaning it.
• Sprayers returned dirty or damaged due to neglect will result in:
  – Loss of sprayer privileges
  – Disciplinary action
  – Possible responsibility for repair costs

SAFETY
• High-pressure spray can inject paint into skin (medical emergency).
• Never point gun at people.
• Always engage trigger lock when not spraying.
• Wear appropriate PPE:
  – Eye protection
  – Gloves
  – Respirator when required`,
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
