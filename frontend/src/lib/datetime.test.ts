import { cairoDate, formatDate, formatLongDate, formatTime } from './datetime';

describe('datetime (BR-GEN-02, OQ-34)', () => {
  it('BR-GEN-02 formats times in Cairo with ص/م', () => {
    expect(formatTime('2026-01-15T06:00:00Z')).toBe('08:00 ص'); // UTC+2 in January
    expect(formatTime('2026-01-15T13:45:00Z')).toBe('03:45 م');
  });

  it('OQ-34 formats dates as DD/MM/YYYY', () => {
    expect(formatDate('2026-09-26T10:00:00Z')).toBe('26/09/2026');
  });

  it('BR-GEN-02 a late-evening Cairo time belongs to the Cairo day (US-26.4)', () => {
    expect(cairoDate(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-16');
  });

  it('BR-GEN-05 long date uses Western digits', () => {
    const text = formatLongDate('2026-09-26T10:00:00Z');
    expect(text).toContain('26');
    expect(text).toContain('2026');
    expect(text).not.toMatch(/[٠-٩]/);
  });
});
