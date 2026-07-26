// Escala cromática estándar usando sostenidos
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Diccionario para normalizar los bemoles a sostenidos y facilitar el cálculo matemático
const FLATS_TO_SHARPS: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};

/**
 * Transpone un acorde individual en cifrado americano.
 * @param chord El acorde original (ej. "C#m7")
 * @param semitones La cantidad de semitonos a mover (+ o -)
 * @returns El nuevo acorde transpuesto
 */
export const transposeChord = (chord: string, semitones: number): string => {
  // Si el token es un separador explícito, lo devolvemos intacto
  if (chord === '-' || chord === '/') return chord;

  // Regex: 
  // Grupo 1: Captura la nota raíz de la A a la G, seguida opcionalmente de un # o b
  // Grupo 2: Captura todo lo demás (m, 7, maj7, sus4, etc.)
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

  // Aplicamos la aritmética modular para el salto
  let newIndex = (currentIndex + semitones) % 12;
  if (newIndex < 0) {
    newIndex += 12;
  }

  // Concatenamos la nueva nota raíz calculada con su modificador original
  return CHROMATIC_SCALE[newIndex] + modifier;
};

// Patrón base de un acorde individual (permite paréntesis para notaciones como C(add9))
const CHORD_PATTERN = '[A-G][#b]?(?:m|maj7|maj|min|sus2|sus4|sus|dim|aug|add|[0-9]|\\(|\\))*';

// Regex estricta para identificar líneas completas de acordes. 
// Valida acordes simples, secuencias compuestas (D/F#, C-Am, G/B-C) o guiones solitarios
const STRICT_CHORD_REGEX = new RegExp(`^(${CHORD_PATTERN})([\\/\\-]${CHORD_PATTERN})*$|^-$`);

/**
 * Transpone el bloque completo de texto de una canción.
 */
export const transposeSongContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;

  // Separamos el texto por saltos de línea reales (\n) o literales (\\n) por seguridad
  const lines = content.split(/(?:\r?\n|\\n)/);

  const transposedLines = lines.map(line => {
    // Extraemos las palabras quitando espacios para analizar
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || words[0] === '') return line;

    // Si TODAS las palabras coinciden con la estructura de acordes, procedemos
    const isChordLine = words.every(word => STRICT_CHORD_REGEX.test(word));

    if (isChordLine) {
      // Separamos conservando los espacios originales para no arruinar la alineación sobre la letra
      const tokens = line.split(/(\s+)/);
      
      return tokens.map(token => {
        if (token.trim() === '') return token;
        
        // Dividimos el token internamente conservando los símbolos / y - como elementos del arreglo
        const subTokens = token.split(/([/\-])/);
        
        // Transponemos cada fragmento musical y volvemos a unir con los separadores intactos
        return subTokens.map(sub => transposeChord(sub, semitones)).join('');
      }).join('');
    }

    // Si la línea tiene palabras que no son acordes (la letra), la devolvemos intacta
    return line;
  });

  // Volvemos a unir el bloque de texto
  return transposedLines.join('\n');
};