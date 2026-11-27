import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFilterStore } from '../filterStore';

describe('filterStore getters de régimen Ley/Efe', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('devuelve valores de Efectivo (Efe) cuando ley es 0', () => {
    const store = useFilterStore();
    store.year = 2026;
    store.month = '11';
    store.tipoliq = 1;
    store.nroadi = 0;
    store.ley = 0;

    expect(store.isLey).toBe(false);
    expect(store.leyTag).toBe('Efe');
    expect(store.leyLabel).toBe('Liquidación Efectivo (0)');
    expect(store.liqCompactString).toBe('202611M0');
    expect(store.liqCompactStringLey).toBe('202611M0_Efe');
    expect(store.liqStringLey).toContain('[Efe]');
  });

  it('devuelve valores de Ley Especial cuando ley es 1', () => {
    const store = useFilterStore();
    store.year = 2026;
    store.month = '11';
    store.tipoliq = 1;
    store.nroadi = 0;
    store.ley = 1;

    expect(store.isLey).toBe(true);
    expect(store.leyTag).toBe('Ley');
    expect(store.leyLabel).toBe('Ley Especial (1)');
    expect(store.liqCompactString).toBe('202611M0');
    expect(store.liqCompactStringLey).toBe('202611M0_Ley');
    expect(store.liqStringLey).toContain('[Ley]');
  });
});
