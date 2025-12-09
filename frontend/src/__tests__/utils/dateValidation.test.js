import { isPastDate, isTodayOrFuture } from '../../utils/dateValidation';

describe('Frontend Date Validation', () => {
  describe('isPastDate', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(isPastDate(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date();
      
      expect(isPastDate(today)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      expect(isPastDate(tomorrow)).toBe(false);
    });

    it('should work with date strings', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      expect(isPastDate(yesterdayString)).toBe(true);
    });
  });

  describe('isTodayOrFuture', () => {
    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(isTodayOrFuture(yesterday)).toBe(false);
    });

    it('should return true for today', () => {
      const today = new Date();
      
      expect(isTodayOrFuture(today)).toBe(true);
    });

    it('should return true for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      expect(isTodayOrFuture(tomorrow)).toBe(true);
    });
  });
});
