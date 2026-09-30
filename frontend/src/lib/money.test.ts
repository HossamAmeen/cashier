import { formatMinor, formatMoney, parseToMinor, percentOfMinor } from './money';

describe('money (BR-GEN-01, ADR-0005)', () => {
  it.each([
    ['45', 4500],
    ['45.5', 4550],
    ['45.50', 4550],
    ['0', 0],
    ['0.01', 1],
    ['350', 35000],
    ['٣٥٠', 35000],
  ])('BR-ITEM-02 parseToMinor(%s) = %i', (text, expected) => {
    expect(parseToMinor(text)).toBe(expected);
  });

  it.each(['45.505', '-1', 'abc', '', '1,000', '1e3', '.5', '0.1.2'])('BR-ITEM-02 rejects "%s"', (text) => {
    expect(parseToMinor(text)).toBeNull();
  });

  it('BR-GEN-01 formats with 2 decimals and thousands separator (OQ-34)', () => {
    expect(formatMinor(485000)).toBe('4,850.00');
    expect(formatMinor(30000)).toBe('300.00');
    expect(formatMinor(5)).toBe('0.05');
    expect(formatMinor(-2000)).toBe('−20.00');
    expect(formatMoney(362000)).toBe('3,620.00 ج.م');
  });

  it('BR-GEN-01 refuses non-integer amounts', () => {
    expect(() => formatMinor(10.5)).toThrow(TypeError);
  });

  it('BR-ORD-07 percentage discount rounds half-up to a whole minor unit', () => {
    expect(percentOfMinor(31500, 10)).toBe(3150);
    expect(percentOfMinor(105, 10)).toBe(11);
    expect(percentOfMinor(104, 10)).toBe(10);
  });
});
