import { describe, expect, it } from 'vitest';

import { SAFE_DOCUMENT_OPTIONS } from '@/viewer/document-options';

describe('SAFE_DOCUMENT_OPTIONS', () => {
  it('XFA を描かず、パソコンのフォントも読まない', () => {
    expect(SAFE_DOCUMENT_OPTIONS).toEqual({ enableXfa: false, useSystemFonts: false });
  });
});
