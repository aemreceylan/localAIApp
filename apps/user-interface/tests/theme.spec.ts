/**
 * @file theme.spec.ts
 * @description Nexus Precision 4 renk paleti ve tema seçeneklerini doğrulayan birim testleri.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_OPTIONS } from '#types/theme.types';

describe('Theme & Palette Contracts', () => {
  it('4 onaylanmış kurumsal renk paleti eksiksiz tanımlı olmalıdır', () => {
    assert.equal(PALETTE_OPTIONS.length, 4);

    const ids = PALETTE_OPTIONS.map((p) => p.id);
    assert.ok(ids.includes('indigo'));
    assert.ok(ids.includes('emerald'));
    assert.ok(ids.includes('obsidian'));
    assert.ok(ids.includes('ocean'));
  });

  it('her palet primary ve secondary renk kodlarına sahip olmalıdır', () => {
    for (const palette of PALETTE_OPTIONS) {
      assert.match(palette.primaryColor, /^#[0-9a-fA-F]{6}$/);
      assert.match(palette.secondaryColor, /^#[0-9a-fA-F]{6}$/);
      assert.ok(palette.name);
      assert.ok(palette.description);
    }
  });
});
