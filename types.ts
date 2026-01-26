export interface ElementData {
  id: number;
  symbol: string;
  name: string;
  z: number; // Atomic Number
  a: number; // Mass Number
  p: number; // Protons
  e: number; // Electrons
  n: number; // Neutrons
  charge: string; // Charge (string to handle '1+', '2-', '0')
}

export interface Question extends ElementData {
  hiddenFields: (keyof ElementData)[];
}

export type GameState = 'MENU' | 'PLAYING' | 'SUMMARY';

export interface UserInput {
  symbol: string;
  name: string;
  z: string;
  a: string;
  p: string;
  e: string;
  n: string;
  charge: string;
}
