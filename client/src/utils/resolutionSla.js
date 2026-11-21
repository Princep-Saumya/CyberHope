const SLA_HOURS = {
  Received: 4,
  Assigned: 24,
  'Under Investigation': 72,
  Resolved: 0,
  Closed: 0,
  'Escalated to DM': 0,
};

function getSlaStartTime(grievance, now = Date.now()) {
  const candidates = [
    grievance?.dispatch_created_at,
    ...(grievance?.status === 'Assigned' ? [grievance?.assignment?.assigned_at] : []),
    grievance?.imported_at,
    grievance?.created_at,
    grievance?.updated_at,
    grievance?.timestamp,
  ];

  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed) && parsed <= now) return parsed;
  }
  return now;
}

function getSlaInfo(grievance, now = Date.now()) {
  const slaHours = SLA_HOURS[grievance?.status] || 0;
  if (slaHours === 0) return null;

  const remaining = getSlaStartTime(grievance, now) + slaHours * 3600000 - now;
  const overdue = remaining < 0;
  const absoluteHours = Math.floor(Math.abs(remaining) / 3600000);
  const absoluteMinutes = Math.floor((Math.abs(remaining) % 3600000) / 60000);
  return {
    overdue,
    label: overdue
      ? `OVERDUE by ${absoluteHours}h ${absoluteMinutes}m`
      : `${absoluteHours}h ${absoluteMinutes}m left`,
  };
}

export { getSlaInfo, getSlaStartTime };
