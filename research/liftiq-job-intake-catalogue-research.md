# LIFTIQ Job Intake Catalogue Research

Capture date: 2026-05-13

Purpose: validate the Phase 1 job-intake catalogue against public Australian crane, rigging, access, and heavy transport fleet language. This research supports catalogue completeness only. It does not create compliance, permit, engineering, WHS, NHVR, or road legality assumptions.

## Sources Reviewed

| Source | URL | Public evidence reviewed | Catalogue impact | Confidence |
|---|---|---|---|---|
| Universal Cranes mobile crane hire | https://universalcranes.com/divisions/mobile-crane-hire/ | Fleet language includes minicranes, pick and carry cranes, Frannas, slew cranes, all-terrain cranes, rough-terrain cranes, crawler cranes, lattice boom truck cranes, and capacities from 3T to 750T. | Confirms mobile/crawler capacity bands and adds mini/spider, Franna/pick-and-carry, rough-terrain, and truck/lattice boom language. | High |
| Universal Cranes fleet page | https://universalcranes.com/our-fleet/ | Fleet filter categories include all-terrain cranes, city cranes, crawler cranes, pick-and-carry cranes, rough-terrain cranes, and individual spider crane examples at 2.5T/2.9T/3.8T/4.9T. | Confirms small crawler/spider options and city/all-terrain categories. | High |
| Smithbridge Group brands page | https://www.smithbridgegroup.com/our-brands | Universal Cranes described as a major Australian crane hire company with high-capacity fleet and cranes up to 600T. | Supports high-capacity crane bands and exact tenant-relevant domain language without copying private data. | Medium |
| Freo Group footprint page | https://freogroup.com.au/what-we-do/footprint/ | Public page references 480+ crane units, 21 branches, and 3T to 800T lifting capacity. | Confirms broad mobile crane capacity spread and national fleet scale. | High |
| Boom Logistics cranes and travel towers | https://www.boomlogistics.com.au/capabilities/cranes-travel-towers/ | Fleet categories include pick-and-carry/Franna under 25T, rough-terrain cranes up to 80T, truck-mounted slewing cranes 20T-50T, all-terrain cranes in 50T-750T bands, crawler cranes 50T-750T, and travel towers 18m-70m. | Adds travel tower/EWP style access category and confirms rough-terrain/truck-mounted options. | High |
| Boom Logistics about page | https://www.boomlogistics.com.au/about-us/ | Describes cranes 260+ from 5T-750T, mobile hydraulic cranes 15T-750T, crawler cranes 50T-750T, heavy haulage with low loaders, boom lifts, scissor lifts, EWPs, and travel towers. | Confirms low loader transport and access equipment terminology. | High |
| Tutt Bryant Heavy Lift and Shift | https://tuttbryant.com.au/division/heavy-lift-shift/ | Public service page references crane hire, heavy lifting, specialised transport, and engineering solutions. | Confirms specialised transport as a catalogue group, without adding engineering claims to LIFTIQ. | Medium |
| Premier Cranes welcome page | https://www.premiercranes.com.au/welcome | Public fleet examples include 25T Franna, 3T Maeda spider crawler, 60T, 100T, 220T, and 450T cranes. | Confirms 3T spider crawler and Franna options. | Medium |
| Premier Cranes Adelaide fleet | https://www.premiercranes.com.au/our-adelaide-fleet | Fleet examples include 60T, 100T, 120T, 250T, 450T all-terrain slew cranes, 350T crawler, 25T and 40T Franna pick-and-carry cranes. | Confirms 40T Franna/pick-and-carry option and current capacity list alignment. | Medium |
| WGC Cranes fleet page | https://www.wgccranes.com.au/fleet | Public fleet page references 13T city crane and 40T Franna examples. | Confirms city crane and Franna categories. | Medium |
| Mammoet Australia | https://www.mammoet.com/about-us/australia/ | Public page references mobile cranes, crawler cranes, conventional trailers, SPMTs, and specialised transport solutions. | Adds SPMT/modular transport as optional specialist transport item. | Medium |
| Mammoet SPMT equipment page | https://www.mammoet.com/equipment/transport/self-propelled-modular-transporter/spmt/ | Public equipment page describes SPMT modules for on-site heavy transport over limited distances. | Supports SPMT as specialist transport/access planning item only, not legal road-access approval. | Medium |

## Equipment Categories Found

- Mobile cranes and all-terrain cranes from small 13T/16T city cranes through 750T/800T high-capacity classes.
- Crawler cranes, including small spider/mini crawler cranes and high-capacity crawler classes.
- Pick-and-carry / Franna cranes, commonly described by Australian crane companies as 20T, 25T, and 40T style options.
- Rough-terrain cranes.
- Truck-mounted slewing cranes and lattice boom truck cranes.
- Travel towers, boom lifts, scissor lifts, and EWPs as access equipment.
- Heavy haulage, low loaders, conventional trailers, and specialist SPMT/modular transport.
- Civil/access equipment such as telehandler, excavator, front-end loader, and site access equipment remains relevant to intake but should stay selectable only where the company enables it.

## Missing Options Discovered

Recommended additions to the supplied catalogue:

- White Card, because it is already supported by worker credential data and job brief parsing.
- RB, because current LIFTIQ sample briefs and rigging allocation flows already use HRWL-RB and it is part of common rigging role language.
- Franna / Pick-and-carry crane, because multiple Australian fleet pages use this as a common category rather than only listing tonnage.
- Mini / Spider Crane, because Universal and Premier list 2.5T-4.9T spider crawler examples.
- Rough Terrain Crane, because Universal and Boom use it as a fleet category.
- Truck-Mounted Slewing Crane, because Boom and regional crane hire pages use truck-mounted crane language.
- Travel Tower / EWP, because Boom lists travel towers and access equipment as part of lifting fleet capability.
- SPMT / Modular Transport, because Mammoet lists SPMTs and specialised transport as a major heavy-lift transport option.

## Options Not Included And Why

- Specific manufacturer models are not included in this job-intake catalogue. Exact crane models remain in the existing crane model/travel-state catalogue.
- Large engineered transport devices such as strand jacks, skidding systems, ring cranes, and girder frames are not included in Phase 1 because they are specialist heavy-lift engineering context and would overcrowd normal job intake.
- Access equipment heights, boom lengths, hook heights, and legal payloads are not included because this catalogue is for requirement selection, not engineering or compliance decisions.
- Public client/project examples were not copied. Only generic equipment and job-intake patterns were used.

## Recommended Global Catalogue

Start from the user-supplied catalogue and add only:

- Credential: White Card
- High Risk Work: RB
- Equipment: Franna / Pick-and-carry Crane
- Equipment: Mini / Spider Crane
- Equipment: Rough Terrain Crane
- Equipment: Truck-Mounted Slewing Crane
- Equipment: Travel Tower / EWP
- Transport: SPMT / Modular Transport

These additions should be globally available but company-filtered, so allocators only see them if their company enables them or if the parser suggests them from a brief.

## Confidence Notes

- High confidence: the main capacity bands and categories in the supplied catalogue are consistent with public Australian fleet language.
- Medium confidence: SPMT/modular transport belongs in the global catalogue as a specialist transport option, but most crane hire pilots may keep it disabled by default.
- Medium confidence: Travel Tower / EWP belongs in the broader access/equipment catalogue, but dispatch teams may treat EWP credentials separately from physical access equipment.
- Low confidence: company-specific vocabulary will vary, so the one-off requirement path remains necessary.

## Boundary

This catalogue is a structured intake and allocation context tool. It does not approve permits, confirm compliance, decide legal road access, engineer lifts, or guarantee safe dispatch.
