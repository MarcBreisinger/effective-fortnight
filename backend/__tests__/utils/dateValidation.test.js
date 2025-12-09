const request = require('supertest');
const express = require('express');
const { rejectPastDates, isPastDate } = require('../../utils/dateValidation');

describe('Date Validation - Past Date Protection', () => {
  describe('isPastDate', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];
      
      expect(isPastDate(dateString)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      expect(isPastDate(dateString)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      expect(isPastDate(dateString)).toBe(false);
    });
  });

  describe('rejectPastDates middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      
      // Test route with the middleware
      app.post('/test/:date', rejectPastDates, (req, res) => {
        res.json({ success: true, date: req.params.date });
      });
    });

    it('should reject requests for past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/test/${pastDate}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify data for past dates');
      expect(response.body.detail).toBe('Changes are only allowed for today and future dates');
    });

    it('should allow requests for today', async () => {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/test/${todayDate}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow requests for future dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/test/${futureDate}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if date parameter is missing', async () => {
      // Test without the :date parameter by creating a route without it
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test', rejectPastDates, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(testApp)
        .post('/test')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Date parameter is required');
    });
  });
});
