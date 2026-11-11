/** Physical constants and unit conversions. Everything in the engine is SI. */

/** Acceleration due to gravity [m/s²]. */
export const G = 9.81;

/** Density of fresh water [kg/m³]. */
export const RHO_WATER = 1000;

/** Dynamic viscosity of water at about 20 °C [Pa·s]. */
export const MU_WATER = 1.002e-3;

/** Bulk modulus of water [Pa]. Used from Phase 4 (water hammer). */
export const K_WATER = 2.2e9;

/** Joules in one kilowatt-hour. */
export const J_PER_KWH = 3.6e6;

/** Joules in one megawatt-hour. */
export const J_PER_MWH = 3.6e9;

export const SECONDS_PER_HOUR = 3600;

export interface Fluid {
  /** Density [kg/m³]. */
  density: number;
  /** Dynamic viscosity [Pa·s]. */
  viscosity: number;
}

export const WATER: Fluid = { density: RHO_WATER, viscosity: MU_WATER };

export const jToKWh = (joules: number): number => joules / J_PER_KWH;
export const jToMWh = (joules: number): number => joules / J_PER_MWH;
