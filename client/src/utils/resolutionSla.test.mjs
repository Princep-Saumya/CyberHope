import test from 'node:test';
import assert from 'node:assert/strict';
import { getSlaInfo, getSlaStartTime } from './resolutionSla.js';

const now = Date.parse('2026-11-21T10:00:00.000Z');

test('uses dispatch creation time for SLA instead of old source publication time', () => {
  const grievance = {
    status: 'Received',
    timestamp: '2025-06-01T10:00:00.000Z',
    imported_at: '2026-11-21T09:00:00.000Z',
    dispatch_created_at: '2026-11-21T09:30:00.000Z',
  };

  assert.equal(getSlaStartTime(grievance, now), Date.parse(grievance.dispatch_created_at));
  assert.deepEqual(getSlaInfo(grievance, now), {
    overdue: false,
    label: '3h 30m left',
  });
});

test('falls back to ingestion time when the source timestamp is in the future', () => {
  const grievance = {
    status: 'Received',
    timestamp: '2028-01-01T00:00:00.000Z',
    imported_at: '2026-11-21T09:00:00.000Z',
  };

  assert.equal(getSlaStartTime(grievance, now), Date.parse(grievance.imported_at));
  assert.equal(getSlaInfo(grievance, now).label, '3h 0m left');
});

test('does not report bogus overdue time for invalid or future-only dates', () => {
  assert.deepEqual(getSlaInfo({
    status: 'Received',
    timestamp: 'not-a-date',
    imported_at: 'also-invalid',
  }, now), {
    overdue: false,
    label: '4h 0m left',
  });

  assert.equal(getSlaStartTime({
    timestamp: '2028-01-01T00:00:00.000Z',
    imported_at: '2029-01-01T00:00:00.000Z',
  }, now), now);
});

test('uses assignment time for assigned-ticket SLA', () => {
  const grievance = {
    status: 'Assigned',
    imported_at: '2026-11-20T00:00:00.000Z',
    assignment: { assigned_at: '2026-11-21T08:00:00.000Z' },
  };

  assert.equal(getSlaStartTime(grievance, now), Date.parse(grievance.assignment.assigned_at));
  assert.equal(getSlaInfo(grievance, now).label, '22h 0m left');
});
