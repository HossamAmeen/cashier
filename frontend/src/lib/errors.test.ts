// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse } from 'yaml';

import { ERROR_MESSAGES, errorMessage, NETWORK_ERROR_MESSAGE } from './errors';

const repo = resolve(__dirname, '../../..');

function brSection9(): Record<string, string> {
  const text = readFileSync(resolve(repo, 'docs/business/BUSINESS_RULES.md'), 'utf8');
  const section = text.split('## 9. Error codes')[1]?.split('\n## ')[0] ?? '';
  const rows = [...section.matchAll(/^\|\s*([A-Z_]+)\s*\|\s*\d{3}\s*\|\s*(.+?)\s*\|\s*$/gm)];
  return Object.fromEntries(rows.map((m) => [m[1], m[2]]));
}

describe('error messages (BR-GEN-06, BR §9)', () => {
  it('BR-GEN-06 every BR §9 code maps to its exact Arabic message', () => {
    const br = brSection9();
    // 24 business codes (v1.2) plus INTERNAL_ERROR from BR v1.3 (GATE B D3).
    expect(Object.keys(br).length).toBeGreaterThanOrEqual(24);
    for (const [code, message] of Object.entries(br)) {
      expect(ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]).toBe(message);
    }
  });

  it('BR-GEN-06 the map covers exactly the contract ErrorCode enum', () => {
    const contract = parse(readFileSync(resolve(repo, 'docs/api/openapi.yaml'), 'utf8')) as {
      components: { schemas: { ErrorCode: { enum: string[] } } };
    };
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual(
      [...contract.components.schemas.ErrorCode.enum].sort(),
    );
  });

  it('maps the client-only network code to the offline message', () => {
    expect(errorMessage('NETWORK_ERROR')).toBe(NETWORK_ERROR_MESSAGE);
    expect(errorMessage('TABLE_OCCUPIED')).toBe('الطاولة مشغولة بطلب آخر');
  });
});
