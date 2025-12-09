import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityLog from '../../components/ActivityLog';
import { LanguageProvider } from '../../contexts/LanguageContext';

const mockTranslations = {
  'activityLog.waiting_list_joined': '{{user}} added {{child}} to waiting list',
  'activityLog.slot_given_up': '{{user}} gave up slot for {{child}}',
  'activityLog.auto_assigned': '{{child}} was automatically assigned from waiting list',
  'urgentRequest': 'urgent',
  'flexibleRequest': 'flexible',
  loading: 'Loading...',
  'activityLog.noEvents': 'No events yet'
};

const MockLanguageProvider = ({ children }) => {
  return (
    <LanguageProvider value={{ 
      t: (key, params) => {
        let text = mockTranslations[key] || key;
        if (params) {
          if (params.child) text = text.replace('{{child}}', params.child);
          if (params.user) text = text.replace('{{user}}', params.user);
        }
        return text;
      }
    }}>
      {children}
    </LanguageProvider>
  );
};

describe('ActivityLog - Urgency Level Display', () => {
  describe('Urgency Emoji Display', () => {
    it('should display fire emoji for urgent waiting list joined events', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: 'urgent'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText(/🔥/)).toBeInTheDocument();
    });

    it('should display star emoji for flexible waiting list joined events', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Max Mueller',
          user_name: 'Peter Mueller',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'C',
            urgency_level: 'flexible'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText(/⭐/)).toBeInTheDocument();
    });

    it('should not display emoji for non-waiting-list events', () => {
      const activities = [
        {
          id: 1,
          event_type: 'slot_given_up',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      const text = screen.getByText(/Platz.*aufgegeben/i);
      expect(text.textContent).not.toContain('🔥');
      expect(text.textContent).not.toContain('⭐');
    });
  });

  describe('Urgency Chip Display', () => {
    it('should display urgent chip for urgent waiting list events', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: 'urgent'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('dringend')).toBeInTheDocument();
    });

    it('should display flexible chip for flexible waiting list events', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Max Mueller',
          user_name: 'Peter Mueller',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'C',
            urgency_level: 'flexible'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('flexibel')).toBeInTheDocument();
    });

    it('should display both group chip and urgency chip', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: 'urgent'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('Group D')).toBeInTheDocument();
      expect(screen.getByText('dringend')).toBeInTheDocument();
    });

    it('should not display urgency chip for events without urgency_level', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D'
            // No urgency_level
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('Group D')).toBeInTheDocument();
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
      expect(screen.queryByText('flexible')).not.toBeInTheDocument();
    });
  });

  describe('Chip Colors', () => {
    it('urgent chip should have error color', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: 'urgent'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      const urgentChip = screen.getByText('dringend').closest('.MuiChip-root');
      expect(urgentChip).toHaveClass('MuiChip-colorError');
    });

    it('flexible chip should have primary color', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Max Mueller',
          user_name: 'Peter Mueller',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'C',
            urgency_level: 'flexible'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      const flexibleChip = screen.getByText('flexibel').closest('.MuiChip-root');
      expect(flexibleChip).toHaveClass('MuiChip-colorPrimary');
    });
  });

  describe('Multiple Activities', () => {
    it('should display multiple activities with different urgency levels', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: 'urgent'
          }
        },
        {
          id: 2,
          event_type: 'waiting_list_joined',
          child_name: 'Max Mueller',
          user_name: 'Peter Mueller',
          created_at: '2025-12-08T10:15:00Z',
          metadata: {
            group: 'C',
            urgency_level: 'flexible'
          }
        },
        {
          id: 3,
          event_type: 'slot_given_up',
          child_name: 'Sophie Klein',
          user_name: 'Maria Klein',
          created_at: '2025-12-08T10:30:00Z',
          metadata: {
            group: 'B'
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('dringend')).toBeInTheDocument();
      expect(screen.getByText('flexibel')).toBeInTheDocument();
      expect(screen.getByText(/🔥/)).toBeInTheDocument();
      expect(screen.getByText(/⭐/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null urgency_level gracefully', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: {
            group: 'D',
            urgency_level: null
          }
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      // Should not crash, should show the basic activity
      expect(screen.getByText(/zur Wartelist/i)).toBeInTheDocument();
    });

    it('should handle missing metadata gracefully', () => {
      const activities = [
        {
          id: 1,
          event_type: 'waiting_list_joined',
          child_name: 'Emma Schmidt',
          user_name: 'Anna Schmidt',
          created_at: '2025-12-08T10:00:00Z',
          metadata: null
        }
      ];

      render(
        <MockLanguageProvider>
          <ActivityLog activities={activities} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText(/zur Wartelist/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    it('should show loading state', () => {
      render(
        <MockLanguageProvider>
          <ActivityLog activities={[]} loading={true} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('Lädt...')).toBeInTheDocument();
    });

    it('should show empty state when no activities', () => {
      render(
        <MockLanguageProvider>
          <ActivityLog activities={[]} loading={false} />
        </MockLanguageProvider>
      );

      expect(screen.getByText('Keine Ereignisse für diesen Tag')).toBeInTheDocument();;
    });
  });
});
