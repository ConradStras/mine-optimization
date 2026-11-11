/**
 * Every technical term the tool uses, in plain language. Term chips, the guided path,
 * explainer animations and the glossary page all read from this one list.
 */
import type { Analysis, MetricKey } from '../engine';
import { energy, hours, metres, num, pct, power } from '../lib/format';

export type ExplainerId = 'head' | 'friction' | 'turbine' | 'pump' | 'roundTrip';

export interface Symbol {
  sym: string;
  meaning: string;
  unit: string;
}

export interface Term {
  id: string;
  name: string;
  /** Phase that introduces it. Terms from later phases show as previews. */
  phase: 1 | 2 | 3 | 4 | 5;
  /** One-line meaning. */
  short: string;
  /** A few plain sentences. */
  plain: string;
  /** A picture from mining. */
  analogy?: string;
  equation?: string;
  symbols?: Symbol[];
  animation?: ExplainerId;
  /** Headline number this term explains, so it can be highlighted on the canvas. */
  metric?: MetricKey;
  /** What this term is on the user's own system right now. */
  live?: (a: Analysis) => string | undefined;
  related?: string[];
}

const mw = (w: number | undefined) => {
  const p = power(w);
  return `${p.value} ${p.unit}`;
};
const mwh = (k: number | undefined) => {
  const e = energy(k);
  return `${e.value} ${e.unit}`;
};

const G_SYM: Symbol = { sym: 'g', meaning: 'gravity', unit: '9.81 m/s²' };
const RHO_SYM: Symbol = { sym: 'ρ', meaning: 'density of water', unit: '1 000 kg/m³' };

export const TERMS: Term[] = [
  {
    id: 'grossHead',
    name: 'Head (gross head)',
    phase: 1,
    short: 'The height the water falls, from one water surface to the other.',
    plain:
      'Head is simply height. In pumped storage it is the vertical drop between the water level in the upper reservoir and the level in the lower one. More head means more energy from every cubic metre, which is why deep mine shafts are attractive.',
    analogy:
      'Like the depth of the shaft from the collar to the station: the deeper the level, the bigger the drop.',
    equation: 'H = z_upper − z_lower',
    symbols: [
      { sym: 'H', meaning: 'gross head', unit: 'm' },
      { sym: 'z', meaning: 'elevation of a water surface', unit: 'm' },
    ],
    animation: 'head',
    metric: 'grossHead',
    live: (a) => (a.grossHead > 0 ? `The water drops ${metres(a.grossHead)}.` : undefined),
    related: ['potentialEnergy', 'netHead'],
  },
  {
    id: 'potentialEnergy',
    name: 'Stored (potential) energy',
    phase: 1,
    short: 'Energy held by water because it sits high up.',
    plain:
      'Water lifted to the upper reservoir holds energy, the way a raised skip holds energy. Let it fall and the energy comes back out. The amount grows with both the volume of water and the head.',
    analogy: 'A loaded skip at the top of the shaft: lift it with power, get power back as it comes down.',
    equation: 'E = ρ · V · g · H',
    symbols: [
      RHO_SYM,
      { sym: 'V', meaning: 'volume of water cycled', unit: 'm³' },
      G_SYM,
      { sym: 'H', meaning: 'gross head', unit: 'm' },
    ],
    animation: 'head',
    metric: 'storedEnergy',
    live: (a) =>
      a.grossHead > 0
        ? `Each m³ falling ${metres(a.grossHead)} holds ${num((9.81 * a.grossHead) / 3600, 2)} kWh.${a.cycle ? ` The full reservoir holds ${mwh(a.cycle.storedEnergy)}.` : ''}`
        : undefined,
    related: ['grossHead', 'usableVolume', 'powerEnergy'],
  },
  {
    id: 'powerEnergy',
    name: 'Power vs energy (MW vs MWh)',
    phase: 1,
    short: 'Power is how fast; energy is how much.',
    plain:
      'Power (kW, MW) is the rate at which energy flows, like the speed of a conveyor. Energy (kWh, MWh) is the total delivered, like the tonnes on the stockpile. A store is described by both: how hard it can push (MW) and for how long (MWh ÷ MW = hours).',
    analogy:
      'A conveyor’s tonnes per hour is power; the tonnes in the stockpile at the end of the shift is energy.',
    equation: 'Energy = Power × time',
    related: ['duration', 'potentialEnergy'],
  },
  {
    id: 'usableVolume',
    name: 'Usable volume',
    phase: 1,
    short: 'The water that actually moves each cycle.',
    plain:
      'Only the smaller of the two reservoirs can be cycled, and a margin is kept at the bottom of each (to keep intakes covered and sediment out). Here 90% of the smaller reservoir is cycled.',
    equation: 'V = 0.9 × min(V_upper, V_lower)',
    live: (a) => (a.usableVolume > 0 ? `You cycle ${num(a.usableVolume)} m³.` : undefined),
    related: ['potentialEnergy'],
  },
  {
    id: 'flowRate',
    name: 'Flow rate (Q)',
    phase: 1,
    short: 'How many cubic metres of water pass each second.',
    plain:
      'Flow rate sets how much power the machine handles. Double the flow and you roughly double the power, but you also empty the reservoir in half the time and friction in the pipes goes up four times.',
    analogy: 'Like the pumping rate of the mine’s dewatering pumps, in m³/s instead of litres per second.',
    equation: 'Q = v · A',
    symbols: [
      { sym: 'Q', meaning: 'flow rate', unit: 'm³/s' },
      { sym: 'v', meaning: 'water velocity', unit: 'm/s' },
      { sym: 'A', meaning: 'pipe cross-section, πD²/4', unit: 'm²' },
    ],
    live: (a) => (a.cycle ? `The turbine passes ${num(a.cycle.generate.flow, 1)} m³/s.` : undefined),
    related: ['velocity', 'headLoss'],
  },
  {
    id: 'velocity',
    name: 'Velocity',
    phase: 1,
    short: 'How fast the water moves along the pipe.',
    plain:
      'The same flow squeezed through a narrower pipe has to move faster. Friction grows with the square of velocity, and so does the shock when a valve shuts. Designers usually keep penstocks between about 2 and 6 m/s.',
    equation: 'v = Q / (π D² / 4)',
    symbols: [
      { sym: 'v', meaning: 'velocity', unit: 'm/s' },
      { sym: 'Q', meaning: 'flow rate', unit: 'm³/s' },
      { sym: 'D', meaning: 'inside diameter of the pipe', unit: 'm' },
    ],
    animation: 'friction',
    live: (a) =>
      a.cycle
        ? `Fastest water on your generating route: ${num(a.cycle.generate.hydraulics.maxVelocity, 1)} m/s.`
        : undefined,
    related: ['headLoss', 'flowRate'],
  },
  {
    id: 'headLoss',
    name: 'Head loss (friction)',
    phase: 1,
    short: 'Height “lost” to friction as water rubs along the pipe.',
    plain:
      'Moving water rubs against the pipe wall and churns at every bend. That costs energy, which engineers express as metres of head lost. It is given back as heat, never as electricity. Longer, narrower and rougher pipes lose more.',
    analogy:
      'Like a long, sagging conveyor: the longer and more cluttered it is, the more of the motor’s effort is lost to friction.',
    equation: 'h_L = (f · L / D + ΣK) · v² / 2g',
    symbols: [
      { sym: 'f', meaning: 'friction factor (from pipe roughness and flow)', unit: '–' },
      { sym: 'L', meaning: 'pipe length', unit: 'm' },
      { sym: 'D', meaning: 'pipe diameter', unit: 'm' },
      { sym: 'ΣK', meaning: 'sum of fitting losses', unit: '–' },
      { sym: 'v', meaning: 'velocity', unit: 'm/s' },
      G_SYM,
    ],
    animation: 'friction',
    metric: 'headLoss',
    live: (a) =>
      a.cycle
        ? `Friction costs ${num(a.cycle.generate.hydraulics.totalLoss, 1)} m of your ${metres(a.grossHead)} drop while generating.`
        : undefined,
    related: ['netHead', 'velocity', 'minorLoss', 'frictionFactor'],
  },
  {
    id: 'frictionFactor',
    name: 'Friction factor (f)',
    phase: 1,
    short: 'A number for how “grippy” the pipe is to the flow.',
    plain:
      'It depends on how rough the pipe wall is compared with its diameter, and on how turbulent the flow is (the Reynolds number). Smooth plastic pipe has a lower factor than old steel. The tool works it out with the Swamee–Jain formula.',
    equation: 'f = 0.25 / [log₁₀(ε / 3.7D + 5.74 / Re⁰·⁹)]²',
    symbols: [
      { sym: 'ε', meaning: 'wall roughness', unit: 'm' },
      { sym: 'Re', meaning: 'Reynolds number, ρvD/μ', unit: '–' },
    ],
    related: ['headLoss'],
  },
  {
    id: 'minorLoss',
    name: 'Fitting (minor) losses',
    phase: 1,
    short: 'Extra friction at bends, valves, inlets and outlets.',
    plain:
      'Each fitting disturbs the flow and costs a little head, written as a coefficient K times the velocity head. A gentle bend is about 0.2–0.4, an open butterfly valve about 0.2, the intake 0.5 and the outlet into a reservoir 1.0.',
    equation: 'h_m = K · v² / 2g',
    related: ['headLoss'],
  },
  {
    id: 'netHead',
    name: 'Net head',
    phase: 1,
    short: 'The head left for the turbine after friction.',
    plain:
      'When generating, the turbine only “sees” the gross head minus the friction losses on the way down. The ratio of net to gross head is a quick check on the pipe design: well-designed systems keep it above about 95%.',
    equation: 'H_net = H − h_L',
    metric: 'netHead',
    live: (a) =>
      a.cycle
        ? `The turbine sees ${metres(a.cycle.generate.machineHead, 1)}: ${pct(a.cycle.hydraulicEfficiencyGenerate)} of the drop.`
        : undefined,
    related: ['headLoss', 'grossHead'],
  },
  {
    id: 'turbine',
    name: 'Turbine & generator',
    phase: 1,
    short: 'Turns falling water into electricity.',
    plain:
      'Water spins the turbine’s runner, which turns a generator. Its efficiency, typically 85–92% for turbine and generator together, is the share of the water’s power that comes out as electricity.',
    equation: 'P_out = η_t · ρ · g · H_net · Q',
    symbols: [
      { sym: 'η_t', meaning: 'turbine × generator efficiency', unit: '0–1' },
      RHO_SYM,
      G_SYM,
      { sym: 'H_net', meaning: 'net head', unit: 'm' },
      { sym: 'Q', meaning: 'flow rate', unit: 'm³/s' },
    ],
    animation: 'turbine',
    metric: 'power',
    live: (a) => (a.cycle ? `The plant delivers ${mw(a.cycle.generate.gridPower)} to the grid.` : undefined),
    related: ['netHead', 'reversibleUnit'],
  },
  {
    id: 'pump',
    name: 'Pump & motor',
    phase: 1,
    short: 'Lifts water back up using cheap or surplus power.',
    plain:
      'The pump must lift the water the full head and also push it through the pipe friction, and it is not perfectly efficient, so pumping always takes more power than generating gives back.',
    equation: 'P_in = ρ · g · H_pump · Q / η_p',
    symbols: [
      RHO_SYM,
      G_SYM,
      { sym: 'H_pump', meaning: 'head plus friction', unit: 'm' },
      { sym: 'Q', meaning: 'flow rate', unit: 'm³/s' },
      { sym: 'η_p', meaning: 'pump × motor efficiency', unit: '0–1' },
    ],
    animation: 'pump',
    metric: 'pumpPower',
    related: ['pumpMode', 'reversibleUnit'],
  },
  {
    id: 'pumpMode',
    name: 'Pumping head',
    phase: 1,
    short: 'The head plus friction that the pump must overcome.',
    plain:
      'Going up, friction works against you instead of with you: the pump must supply the full drop plus every metre of friction loss.',
    equation: 'H_pump = H + h_L',
    animation: 'pump',
    metric: 'pumpPower',
    live: (a) =>
      a.cycle && !a.pumpAssumed
        ? `The pump works against ${metres(a.cycle.pump.machineHead, 1)} and draws ${mw(a.cycle.pump.gridPower)}.`
        : undefined,
    related: ['pump', 'headLoss'],
  },
  {
    id: 'reversibleUnit',
    name: 'Reversible pump-turbine',
    phase: 1,
    short: 'One machine that pumps one way and generates the other.',
    plain:
      'Spun one way it is a turbine; driven the other way it is a pump. One machine and one set of pipes saves cost and space underground, at the price of being a little less efficient than two machines each built for one job.',
    analogy: 'Like a winder motor that also regenerates power when the loaded conveyance comes down.',
    animation: 'turbine',
    related: ['turbine', 'pump'],
  },
  {
    id: 'roundTripEfficiency',
    name: 'Round-trip efficiency',
    phase: 1,
    short: 'Electricity out ÷ electricity in, over a full cycle.',
    plain:
      'Every step loses a little: transformer, pump, pipe friction going up, seepage, friction coming down, turbine, transformer again. What is left is the round-trip efficiency. Small and medium pumped storage plants usually achieve 70–80%; large ones up to 85%.',
    analogy: 'Put 10 kWh in, get about 7.5 kWh back. The 2.5 kWh is the price of time-shifting energy.',
    equation: 'RTE = E_out / E_in',
    animation: 'roundTrip',
    metric: 'roundTripEfficiency',
    live: (a) =>
      a.cycle && !a.pumpAssumed
        ? `It returns ${pct(a.cycle.roundTripEfficiency)} of what it takes in.`
        : undefined,
    related: ['headLoss', 'turbine', 'pump', 'seepage'],
  },
  {
    id: 'duration',
    name: 'Storage duration',
    phase: 1,
    short: 'How many hours the plant can run at full power.',
    plain:
      'Duration is the energy stored divided by the power: the time to empty the upper reservoir at full flow. Pumped storage suits several hours (evening peaks, overnight); batteries suit shorter, sharper bursts.',
    equation: 't = V / Q',
    metric: 'duration',
    live: (a) => (a.cycle ? `The plant runs ${hours(a.cycle.generate.hours)} at full power.` : undefined),
    related: ['powerEnergy'],
  },
  {
    id: 'seepage',
    name: 'Seepage & evaporation',
    phase: 1,
    short: 'Water that leaks or evaporates before it can be used.',
    plain:
      'Some stored water seeps into the ground or evaporates from an open dam. It is set as a share of the stored volume per cycle on the upper reservoir. Covered tanks and lined dams keep it low.',
    related: ['roundTripEfficiency'],
  },
  {
    id: 'upperReservoir',
    name: 'Upper reservoir',
    phase: 1,
    short: 'The surface store: full means charged.',
    plain:
      'A lined dam, tank or rehabilitated existing dam near the shaft collar. Its volume and the head together set how much energy the system holds.',
    related: ['potentialEnergy', 'usableVolume'],
  },
  {
    id: 'lowerReservoir',
    name: 'Lower reservoir',
    phase: 1,
    short: 'The underground store that receives the water.',
    plain:
      'An excavated chamber, sealed old workings or a tank deep in the mine. Using existing voids can make this much cheaper, if the rock is sound and water-tight.',
    related: ['grossHead'],
  },
  {
    id: 'penstock',
    name: 'Penstock',
    phase: 1,
    short: 'The pressure pipe that carries water down to the machine.',
    plain:
      'In a mine the penstock runs down the shaft. At the bottom it holds the full pressure of the water column (about 1 bar every 10 m), so deep sections are usually welded steel. Its diameter is the main lever on friction loss and cost.',
    related: ['headLoss', 'velocity'],
  },
  {
    id: 'valve',
    name: 'Valve',
    phase: 1,
    short: 'Shuts off the flow for safety or maintenance.',
    plain:
      'Butterfly valves are compact and cheap; spherical valves seal tighter and lose almost nothing when open but cost more. Closing a valve fast causes water hammer (Phase 4).',
    related: ['minorLoss', 'waterHammer'],
  },
  {
    id: 'transformer',
    name: 'Transformer & switchgear',
    phase: 1,
    short: 'Connects the machines to the mine’s electricity network.',
    plain:
      'Steps voltage between the machine and the grid and protects both. About 0.5–1.5% of the power is lost each way.',
    related: ['roundTripEfficiency'],
  },
  {
    id: 'controls',
    name: 'Control & monitoring',
    phase: 1,
    short: 'The SCADA system that runs the plant.',
    plain:
      'Sensors, programmable controllers and protection relays that start, stop and switch the machines between pumping and generating, and trip them safely when something goes wrong.',
  },
  {
    id: 'capex',
    name: 'Capital cost (CAPEX)',
    phase: 1,
    short: 'What it costs to build.',
    plain:
      'The up-front cost of every component: civil works, pipes, machines, electrical and controls. Each component on the canvas carries its own cost card. Phase 1 rates are indicative only; Phase 2 adds an editable cost library.',
    metric: 'capex',
    related: ['omCost', 'costPerKW'],
  },
  {
    id: 'omCost',
    name: 'Operating & maintenance cost (O&M)',
    phase: 1,
    short: 'What it costs each year to keep running.',
    plain:
      'Usually written as a percentage of the capital cost per year: low for dams and tunnels, higher for machines and controls.',
    related: ['capex'],
  },
  {
    id: 'costPerKW',
    name: 'Cost per kW and per kWh',
    phase: 1,
    short: 'Capital cost divided by power, or by energy stored.',
    plain:
      'Two quick ways to compare storage options. Cost per kW suits plants judged on peak power; cost per kWh suits plants judged on how long they can deliver. Pumped storage usually looks dear per kW and cheap per kWh compared with batteries.',
    related: ['capex', 'powerEnergy'],
  },
  {
    id: 'arbitrage',
    name: 'Energy arbitrage',
    phase: 2,
    short: 'Buying power cheap, selling (or avoiding) it when dear.',
    plain:
      'Pump when electricity is cheap (off-peak or solar surplus), generate when it is expensive (peak). The gap between the two prices is the arbitrage spread, and it must cover the round-trip losses.',
  },
  {
    id: 'npv',
    name: 'Net present value (NPV)',
    phase: 2,
    short: 'All future cash flows, discounted to today.',
    plain:
      'Money later is worth less than money now. NPV adds up every year’s cash flow, discounted at the cost of capital, minus the build cost.',
  },
  {
    id: 'stateOfCharge',
    name: 'State of charge',
    phase: 3,
    short: 'How full the store is, from 0% to 100%.',
    plain:
      'For pumped storage it is how full the upper reservoir is; for a battery, how much charge it holds.',
  },
  {
    id: 'waterHammer',
    name: 'Water hammer',
    phase: 4,
    short: 'The pressure spike when moving water is stopped suddenly.',
    plain:
      'Stop a long column of water fast (a valve slams, a pump trips) and its momentum turns into a pressure wave that races up and down the pipe. It can triple the static pressure, so pipes, valves and surge protection are sized for it.',
    equation: 'ΔH = a · Δv / g',
  },
];

export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(TERMS.map((t) => [t.id, t]));
