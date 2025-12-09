const db = require('../../config/database');
const { processWaitingList, processSlotGiveUp } = require('../../utils/waitingListProcessor');

jest.mock('../../config/database');

describe('Waiting List Processor - Urgency Levels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Structure Tests', () => {
    it('should include urgency_level in waiting list query with correct ORDER BY', async () => {
      const date = '2025-12-08';
      const attendingGroups = ['A', 'B', 'C', 'D'];

      // Mock: 1) children to restore, 2) waiting list
      db.query
        .mockResolvedValueOnce([[]]) // Children to restore (empty)
        .mockResolvedValueOnce([[]]); // Waiting list (empty)

      await processWaitingList(date, attendingGroups);

      // The waiting list query is the SECOND db.query call (index 1)
      const waitingListQuery = db.query.mock.calls[1];
      expect(waitingListQuery[0]).toContain('das.urgency_level');
      expect(waitingListQuery[0]).toContain('ORDER BY das.urgency_level DESC, das.updated_at ASC');
    });
  });

  describe('processSlotGiveUp', () => {
    it('should include urgency_level in query when processing give ups', async () => {
      const date = '2025-12-08';
      const childId = 1;
      const attendingGroups = ['A', 'B', 'C', 'D'];

      const mockGivenUpChild = [
        {
          assigned_group: 'D',
          capacity: 10
        }
      ];

      const mockGroupCount = [
        {
          count: 8
        }
      ];

      db.query
        .mockResolvedValueOnce([mockGivenUpChild]) // Get given up child's group and capacity
        .mockResolvedValueOnce([mockGroupCount]) // Get current group count
        .mockResolvedValueOnce([[]]); // Waiting list (empty)

      await processSlotGiveUp(date, childId, attendingGroups);

      // The waiting list query is the THIRD db.query call (index 2)
      const waitingListQuery = db.query.mock.calls[2];
      expect(waitingListQuery[0]).toContain('das.urgency_level');
      expect(waitingListQuery[0]).toContain('ORDER BY das.urgency_level DESC, das.updated_at ASC');
    });
  });
});
