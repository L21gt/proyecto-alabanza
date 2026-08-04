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
  // Si el token es un separador explícito, lo devolvemos intacto
  if (chord === '-' || chord === '/') return chord;

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

// Patrón robusto para acordes simples y compuestos (soporta alteraciones modernas como m7b5, 7#9, maj7#11, add9, etc.)
const CHORD_PATTERN = '[A-G][#b]?(?:m|maj|min|M|sus|dim|aug|add|alt|[0-9]|#|b|\\+|°|∆|\\(|\\))*';

// Regex estricta para identificar líneas completas de acordes (acordes simples, slash chords D/F# o guiones C-Am)
const STRICT_CHORD_REGEX = new RegExp(`^(${CHORD_PATTERN})([\\/\\-]${CHORD_PATTERN})*$|^-$`);

// Regex para marcadores comunes de partitura/cifrado que pueden acompañar una línea de acordes sin invalidarla
const CHART_MARKER_REGEX = /^(\([0-9]+x\)|\(x[0-9]+\)|\(Bis\)|\(bis\)|\|+|%|N\.C\.|[xX][0-9]+|[0-9]+[xX])$/i;

/**
 * Transpone el bloque completo de texto de una canción preservando espacios y alineación.
 */
export const transposeSongContent = (content: string, semitones: number): string => {
  if (semitones === 0) return content;

  // Separamos el texto por saltos de línea reales (\n) o literales (\\n) por seguridad
  const lines = content.split(/(?:\r?\n|\\n)/);

  const transposedLines = lines.map(line => {
    // Extraemos las palabras quitando espacios para analizar si es una línea musical
    const words = line.trim().split(/\s+/);
    if (words.length === 0 || words[0] === '') return line;

    // Una línea se considera de acordes si cada palabra es un acorde válido O un marcador de partitura
    const isChordLine = words.every(word => 
      STRICT_CHORD_REGEX.test(word) || CHART_MARKER_REGEX.test(word)
    );

    if (isChordLine) {
      // Separamos conservando los espacios originales para no arruinar la alineación sobre la letra
      const tokens = line.split(/(\s+)/);
      
      return tokens.map(token => {
        const trimmed = token.trim();
        if (trimmed === '') return token;
        
        // Si el token es un marcador de estructura de partitura (ej. (2x), |, N.C.), se devuelve intacto
        if (CHART_MARKER_REGEX.test(trimmed)) return token;

        // Dividimos el token internamente conservando los símbolos / y - como elementos del arreglo
        const subTokens = token.split(/([/\-])/);
        
        // Transponemos cada fragmento musical y volvemos a unir con los separadores intactos
        return subTokens.map(sub => transposeChord(sub, semitones)).join('');
      }).join('');
    }

    // Si la línea tiene palabras que no son acordes (la letra del himno), la devolvemos intacta
    return line;
  });

  // Volvemos a unir el bloque de texto
  return transposedLines.join('\n');
};