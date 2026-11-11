/** Technical note §3: E = ρ · V · g · h  [J]. */
import { G } from './constants';

export const potentialEnergy = (density: number, volume: number, head: number): number =>
  density * volume * G * head;
