/**
 * Technical note §2: power in turbine (generating) and pump (charging) mode.
 *   P_out = η_t · ρ · g · H_net · Q,   H_net  = H_gross − h_L
 *   P_in  = ρ · g · H_pump · Q / η_p,  H_pump = H_gross + h_L
 */
import { G } from './constants';

export const turbinePower = (efficiency: number, density: number, netHead: number, flow: number): number =>
  netHead > 0 ? efficiency * density * G * netHead * flow : 0;

export const pumpPower = (efficiency: number, density: number, pumpHead: number, flow: number): number =>
  efficiency > 0 ? (density * G * pumpHead * flow) / efficiency : Infinity;
