import { transposeChord, transposeSongContent } from '../utils/transposer';

describe('Motor de Transposición (Cifrado Americano)', () => {
  
  describe('Transposición Básica (Hacia adelante)', () => {
    it('Debería transponer C a D (+2 semitonos)', () => {
      expect(transposeChord('C', 2)).toBe('D');
    });

    it('Debería transponer E a F (+1 semitono - salto natural)', () => {
      expect(transposeChord('E', 1)).toBe('F');
    });
  });

  describe('Transposición Básica (Hacia atrás)', () => {
    it('Debería transponer G a F (-2 semitonos)', () => {
      expect(transposeChord('G', -2)).toBe('F');
    });

    it('Debería transponer C a B (-1 semitono - salto natural)', () => {
      expect(transposeChord('C', -1)).toBe('B');
    });
  });

  describe('Manejo de Ciclos Matemáticos (Aritmética Modular)', () => {
    it('Debería dar la vuelta a la escala hacia adelante (B + 2 = C#)', () => {
      expect(transposeChord('B', 2)).toBe('C#');
    });

    it('Debería dar la vuelta a la escala hacia atrás (C - 2 = A#)', () => {
      expect(transposeChord('C', -2)).toBe('A#');
    });
    
    it('Debería mantenerse igual si se transponen 12 semitonos (1 octava)', () => {
      expect(transposeChord('D', 12)).toBe('D');
      expect(transposeChord('F', -12)).toBe('F');
    });
  });

  describe('Manejo de Acordes Complejos y Sostenidos/Bemoles', () => {
    it('Debería conservar las variantes del acorde (m, maj7, sus4)', () => {
      expect(transposeChord('Am', 2)).toBe('Bm');
      expect(transposeChord('Cmaj7', 4)).toBe('Emaj7');
      expect(transposeChord('Dsus4', -2)).toBe('Csus4');
    });

    it('Debería procesar correctamente acordes con sostenidos (#)', () => {
      expect(transposeChord('F#m', 2)).toBe('G#m');
    });

    it('Debería normalizar acordes con bemoles (b) a su equivalente en sostenido', () => {
      // Bb (Si bemol) transpuesto +2 debería ser C
      expect(transposeChord('Bb', 2)).toBe('C');
      // Eb (Mi bemol) transpuesto -1 debería ser D
      expect(transposeChord('Eb', -1)).toBe('D');
    });
  });

  describe('Manejo de Errores', () => {
    it('Debería retornar el mismo texto si no es un acorde válido', () => {
      expect(transposeChord('Hola', 2)).toBe('Hola');
      expect(transposeChord('Zmaj7', 1)).toBe('Zmaj7');
    });
  });

  describe('Procesamiento de Texto Multilínea', () => {
    it('Debería transponer solo las líneas de acordes y mantener la letra intacta', () => {
      const original = "G\nBueno es alabarte oh Señor";
      const expected = "A\nBueno es alabarte oh Señor";
      // Subir 2 semitonos (G -> A)
      expect(transposeSongContent(original, 2)).toBe(expected);
    });

    it('Debería manejar múltiples acordes en una línea y bajos invertidos', () => {
      const original = "G        D/F#     Em\nTu fidelidad es grande";
      const expected = "F        C/E     Dm\nTu fidelidad es grande";
      // Bajar 2 semitonos
      expect(transposeSongContent(original, -2)).toBe(expected);
    });

    it('Debería devolver el texto intacto si los semitonos son 0', () => {
      const original = "C\nTest";
      expect(transposeSongContent(original, 0)).toBe(original);
    });
  });
});