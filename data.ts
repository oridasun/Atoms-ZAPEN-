
import { ElementData, Question } from './types';

const completeData: ElementData[] = [
  { id: 1, symbol: 'H', name: 'Hidrógeno', z: 1, a: 1, p: 1, e: 1, n: 0, charge: '0' },
  { id: 2, symbol: 'He', name: 'Helio', z: 2, a: 4, p: 2, e: 2, n: 2, charge: '0' },
  { id: 3, symbol: 'Li', name: 'Litio', z: 3, a: 7, p: 3, e: 3, n: 4, charge: '0' },
  { id: 4, symbol: 'Be', name: 'Berilio', z: 4, a: 9, p: 4, e: 4, n: 5, charge: '0' },
  { id: 5, symbol: 'B', name: 'Boro', z: 5, a: 11, p: 5, e: 5, n: 6, charge: '0' },
  { id: 6, symbol: 'C', name: 'Carbono', z: 6, a: 12, p: 6, e: 6, n: 6, charge: '0' },
  { id: 7, symbol: 'N', name: 'Nitrógeno', z: 7, a: 14, p: 7, e: 7, n: 7, charge: '0' },
  { id: 8, symbol: 'O', name: 'Oxígeno', z: 8, a: 16, p: 8, e: 8, n: 8, charge: '0' },
  { id: 9, symbol: 'F', name: 'Flúor', z: 9, a: 19, p: 9, e: 9, n: 10, charge: '0' },
  { id: 10, symbol: 'Ne', name: 'Neón', z: 10, a: 20, p: 10, e: 10, n: 10, charge: '0' },
  { id: 11, symbol: 'Na', name: 'Sodio', z: 11, a: 23, p: 11, e: 11, n: 12, charge: '0' },
  { id: 12, symbol: 'Mg', name: 'Magnesio', z: 12, a: 24, p: 12, e: 12, n: 12, charge: '0' },
  { id: 13, symbol: 'Al', name: 'Aluminio', z: 13, a: 27, p: 13, e: 13, n: 14, charge: '0' },
  { id: 14, symbol: 'Si', name: 'Silicio', z: 14, a: 28, p: 14, e: 14, n: 14, charge: '0' },
  { id: 15, symbol: 'P', name: 'Fósforo', z: 15, a: 31, p: 15, e: 15, n: 16, charge: '0' },
  { id: 16, symbol: 'S', name: 'Azufre', z: 16, a: 32, p: 16, e: 16, n: 16, charge: '0' },
  { id: 17, symbol: 'Cl', name: 'Cloro', z: 17, a: 35, p: 17, e: 17, n: 18, charge: '0' },
  { id: 18, symbol: 'Ar', name: 'Argón', z: 18, a: 40, p: 18, e: 18, n: 22, charge: '0' },
  { id: 19, symbol: 'K', name: 'Potasio', z: 19, a: 39, p: 19, e: 19, n: 20, charge: '0' },
  { id: 20, symbol: 'Ca', name: 'Calcio', z: 20, a: 40, p: 20, e: 20, n: 20, charge: '0' },
  { id: 21, symbol: 'Sc', name: 'Escandio', z: 21, a: 45, p: 21, e: 21, n: 24, charge: '0' },
  { id: 22, symbol: 'Ti', name: 'Titanio', z: 22, a: 48, p: 22, e: 22, n: 26, charge: '0' },
  { id: 23, symbol: 'V', name: 'Vanadio', z: 23, a: 51, p: 23, e: 23, n: 28, charge: '0' },
  { id: 24, symbol: 'Cr', name: 'Cromo', z: 24, a: 52, p: 24, e: 24, n: 28, charge: '0' },
  { id: 25, symbol: 'Mn', name: 'Manganeso', z: 25, a: 55, p: 25, e: 25, n: 30, charge: '0' },
  { id: 26, symbol: 'Fe', name: 'Hierro', z: 26, a: 56, p: 26, e: 26, n: 30, charge: '0' },
  { id: 27, symbol: 'Co', name: 'Cobalto', z: 27, a: 59, p: 27, e: 27, n: 32, charge: '0' },
  { id: 28, symbol: 'Ni', name: 'Níquel', z: 28, a: 59, p: 28, e: 28, n: 31, charge: '0' },
  { id: 29, symbol: 'Cu', name: 'Cobre', z: 29, a: 64, p: 29, e: 29, n: 35, charge: '0' },
  { id: 30, symbol: 'Zn', name: 'Zinc', z: 30, a: 65, p: 30, e: 30, n: 35, charge: '0' },
  // Iones (31-50)
  { id: 31, symbol: 'Li⁺', name: 'Catión Litio', z: 3, a: 7, p: 3, e: 2, n: 4, charge: '1+' },
  { id: 32, symbol: 'Na⁺', name: 'Catión Sodio', z: 11, a: 23, p: 11, e: 10, n: 12, charge: '1+' },
  { id: 33, symbol: 'K⁺', name: 'Catión Potasio', z: 19, a: 39, p: 19, e: 18, n: 20, charge: '1+' },
  { id: 34, symbol: 'Mg²⁺', name: 'Catión Magnesio', z: 12, a: 24, p: 12, e: 10, n: 12, charge: '2+' },
  { id: 35, symbol: 'Ca²⁺', name: 'Catión Calcio', z: 20, a: 40, p: 20, e: 18, n: 20, charge: '2+' },
  { id: 36, symbol: 'Fe²⁺', name: 'Catión Hierro (II)', z: 26, a: 56, p: 26, e: 24, n: 30, charge: '2+' },
  { id: 37, symbol: 'Fe³⁺', name: 'Catión Hierro (III)', z: 26, a: 56, p: 26, e: 23, n: 30, charge: '3+' },
  { id: 38, symbol: 'Cu²⁺', name: 'Catión Cobre (II)', z: 29, a: 64, p: 29, e: 27, n: 35, charge: '2+' },
  { id: 39, symbol: 'Al³⁺', name: 'Catión Aluminio', z: 13, a: 27, p: 13, e: 10, n: 14, charge: '3+' },
  { id: 40, symbol: 'Ag⁺', name: 'Catión Plata', z: 47, a: 108, p: 47, e: 46, n: 61, charge: '1+' },
  { id: 41, symbol: 'F⁻', name: 'Anión Fluoruro', z: 9, a: 19, p: 9, e: 10, n: 10, charge: '1-' },
  { id: 42, symbol: 'Cl⁻', name: 'Anión Cloruro', z: 17, a: 35, p: 17, e: 18, n: 18, charge: '1-' },
  { id: 43, symbol: 'Br⁻', name: 'Anión Bromuro', z: 35, a: 80, p: 35, e: 36, n: 45, charge: '1-' },
  { id: 44, symbol: 'I⁻', name: 'Anión Yoduro', z: 53, a: 127, p: 53, e: 54, n: 74, charge: '1-' },
  { id: 45, symbol: 'O²⁻', name: 'Anión Óxido', z: 8, a: 16, p: 8, e: 10, n: 8, charge: '2-' },
  { id: 46, symbol: 'S²⁻', name: 'Anión Sulfuro', z: 16, a: 32, p: 16, e: 18, n: 16, charge: '2-' },
  { id: 47, symbol: 'Se²⁻', name: 'Anión Seleniuro', z: 34, a: 79, p: 34, e: 36, n: 45, charge: '2-' },
  { id: 48, symbol: 'N³⁻', name: 'Anión Nitruro', z: 7, a: 14, p: 7, e: 10, n: 7, charge: '3-' },
  { id: 49, symbol: 'P³⁻', name: 'Anión Fosfuro', z: 15, a: 31, p: 15, e: 18, n: 16, charge: '3-' },
  { id: 50, symbol: 'H⁻', name: 'Anión Hidruro', z: 1, a: 1, p: 1, e: 2, n: 0, charge: '1-' },
];

export const getQuestions = (): Question[] => {
  return completeData.map((item, index) => {
    let hidden: (keyof ElementData)[] = [];
    const i = index + 1;

    // Lógica "Tabla 2": Ocultamos 4 o 5 campos estratégicos para forzar el razonamiento matemático
    if (i <= 30) {
      // Neutros: Ocultamos combinaciones que requieren A=Z+N o Carga=0 explícita
      const patterns = [
        ['name', 'z', 'a', 'charge'],
        ['symbol', 'z', 'e', 'n'],
        ['name', 'a', 'p', 'e', 'charge'],
        ['symbol', 'z', 'a', 'p', 'charge'],
        ['name', 'z', 'p', 'e', 'n'],
        ['symbol', 'a', 'p', 'n', 'charge']
      ];
      hidden = patterns[index % patterns.length] as (keyof ElementData)[];
    } else {
      // Iones: Ocultamos combinaciones que requieren Carga=P-E y A=P+N
      const patterns = [
        ['name', 'a', 'p', 'charge', 'e'],
        ['symbol', 'z', 'e', 'n', 'charge'],
        ['name', 'z', 'a', 'charge', 'p'],
        ['symbol', 'a', 'p', 'e', 'n'],
        ['name', 'z', 'n', 'charge', 'e']
      ];
      hidden = patterns[index % patterns.length] as (keyof ElementData)[];
    }

    return { ...item, hiddenFields: hidden };
  });
};
