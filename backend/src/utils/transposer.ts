// Escala cromática estándar usando sostenidos
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Diccionario ampliado para normalizar los bemoles a sostenidos (incluye Cb y Fb por completitud armónica)
const FLATS_TO_SHARPS: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
  'Cb': 'B',
  'Fb': 'E'
};

/**
 * Transpone un acorde individual en cifrado americano.
 * @param chord El acorde original (ej. "F#m7b5", "C#m7")
 * @param semitones La cantidad de semitonos a mover (+ o -)
 * @returns El nuevo acorde transpuesto
 */
export const transposeChord = (chord: string, semitones: number): string => {
  // Regex: 
  // Grupo 1: Captura la nota raíz de la A a la G, seguida opcionalmente de un # o b
  // Grupo 2: Captura todo lo demás (m, 7, maj7, sus4, m7b5, 7#9, add9, etc.)
  const regex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(regex);

  // Si no coincide con un formato de acorde válido, retornamos el texto original
  if (!match) return chord;

  let root = match[1];
  const modifier = match[2];

  // Si la nota raíz es un bemol (b), la convertimos a su equivalente en sostenido (#)
  if (FLATS_TO_SHARPS[root]) {
    root = FLATS_TO_SHARPS[root];
  }

  // Buscamos la posición actual de la nota en nuestra escala (del 0 al 11)
  const currentIndex = CHROMATIC_SCALE.indexOf(root);
  
  if (currentIndex === -1) return chord; // Seguridad adicional

  // Aplicamos la aritmética modular para el salto cromático
  let newIndex = (currentIndex + semitones) % 12;
  if (newIndex < 0) {
    newIndex += 12;
  }

  // Concatenamos la nueva nota raíz calculada con su modificador armónico original
  return CHROMATIC_SCALE[newIndex] + modifier;
};

// Regex avanzada para encontrar acordes individuales incrustados en una línea.
// CORRECCIÓN: Se envuelve el bloque de modificadores en un grupo global `((?:...)*)` para capturarlo completo.
const CHORD_SEARCH_REGEX = /(^|[\s\/\-\(\)])([A-G][#b]?)((?:m|maj|min|M|sus|dim|aug|add|alt|[0-9]|#|b|\+|°|∆)*)(?=[\s\/\-\(\)xX]|$)/g;

/**
 * Transpone el bloque completo de texto de una canción preservando espacios y alineación.
 */
export const transposeSongContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;

  // Separamos el texto por saltos de línea reales (\n) o literales (\\n) por seguridad
  const lines = content.split(/(?:\r?\n|\\n)/);

  const transposedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 1. EVALUACIÓN INTELIGENTE: ¿Es una línea de acordes o de letra?
    // Extraemos todos los acordes válidos de la línea
    const cleanedOfChords = trimmed.replace(CHORD_SEARCH_REGEX, '');
    
    // Extraemos todos los símbolos musicales y espacios sobrantes
    const withoutSymbols = cleanedOfChords.replace(/[\s\/\-\(\)xX\d\|%N\.C\.]/gi, '');
    
    // Si después de quitar los acordes y conectores queda menos del 30% del texto, ES una línea musical.
    const isChordLine = withoutSymbols.length < (trimmed.length * 0.3);

    if (isChordLine) {
      // 2. TRANSPOSICIÓN ROBUSTA: Transponemos al vuelo preservando estrictamente la separación
      return line.replace(CHORD_SEARCH_REGEX, (match, prefix, root, modifier) => {
        const chord = root + (modifier || '');
        const transposed = transposeChord(chord, semitones);
        return prefix + transposed;
      });
    }

    // Si la línea no pasó la prueba, es la letra de la canción y se devuelve intacta
    return line;
  });

  // Volvemos a unir el bloque de texto
  return transposedLines.join('\n');
};