# TODO: Data coverage

`data/evs.json` now covers **28 makes / 72 models / 128 trims** — up from 9 makes / 16 models / 30 trims. Every make identified in the original survey below (German luxury, other premium/EV-native, mainstream, trucks, and the 2027-ready batch) has been researched and merged in, each trim sourced from manufacturer spec pages + fueleconomy.gov + a review link, following `data/SCHEMA.md`.

## What's in now

- **German luxury**: BMW (i4, i5, i7, iX, iX3), Mercedes-Benz (EQB, EQE sedan/SUV, EQS sedan/SUV), Audi (Q4/Q6/SQ6/Q8 e-tron, e-tron GT), Porsche (Taycan, Macan Electric)
- **Other premium/EV-native**: MINI (Countryman Electric only — see note below), Genesis (GV60, Electrified GV70/G80), Volvo (EX30, EX60, EX90, EC40), Polestar (2, 3, 4), Lucid (Air, Gravity), Lexus (RZ, ES)
- **Mainstream**: Nissan (Ariya, Leaf), Toyota (bZ4X), Subaru (Solterra), Fiat (500e), Acura (ZDX), VinFast (VF8, VF9)
- **Trucks**: Ford F-150 Lightning, Chevrolet Silverado EV, GMC Hummer EV Pickup, GMC Sierra EV, Tesla Cybertruck
- **More trims of makes already covered**: Kia Niro EV, Hyundai Kona Electric + Ioniq 9, Cadillac Optiq + Vistiq + Escalade IQ, Jeep Wagoneer S + Recon
- **2027 models with real published specs**: BMW iX3, Lexus ES 350e/500e, Rivian R2, Chevrolet Bolt relaunch, Volvo EX60, Dodge Charger Daytona

## Known gaps / judgment calls from this pass

- **MINI Cooper SE Hardtop is NOT in the dataset** — it's not actually sold in the US (China-built, currently tariff-blocked; MINI has deferred the US launch indefinitely). Only Countryman Electric made it in.
- **Ram 1500 REV was skipped** — confirmed cancelled; Stellantis reused the name for a gas range-extender instead, not a BEV.
- **Tesla Model S** is still missing (we have 3/X/Y/Cybertruck) — worth a quick follow-up batch.
- **Hyundai Ioniq 5 N** and **Cadillac Celestiq** were deliberately skipped as niche/halo trims — could add if there's interest.
- **GM Super Cruise** is normalized to `selfDriving.available: false` across every Cadillac/Chevrolet/GMC entry (treated as adaptive-cruise-tier driver-assist, not self-driving) — a few early entries briefly drifted from this and were corrected for consistency.

## Still explicitly deferred (low priority / low-volume)

- Rolls-Royce Spectre, Maserati Grecale Folgore/GranTurismo Folgore, Lotus Eletre/Emeya, Land Rover Range Rover Electric, Faraday Future FF91 — ultra-low-volume exotics, low practical value for a shopping-comparison tool. Add on request.

## Not yet on sale (watch, don't add yet)

- **Kia EV4** — full specs exist but US launch delayed indefinitely (tariffs/demand), no confirmed on-sale date.
- **Scout Traveler / Terra** — specs still "estimated," not final; production doesn't start until end of 2027 as **2028** models.
- **Slate Truck** — timing TBD, no confirmed specs yet.

## Next step

Nothing urgent queued. If new 2027 models get real published specs (the way BMW iX3/Lexus ES/Rivian R2/Chevy Bolt/Volvo EX60 did), add them the same way. Otherwise, revisit when Kia EV4 or Scout actually get a confirmed on-sale date.
