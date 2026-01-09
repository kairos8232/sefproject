-- Migration: Add package support for venue bookings and resource requests
-- Date: 2026-01-10
-- Purpose: Allow multiple venues and resources to be requested as a single package

-- Add package_id to venue_bookings
ALTER TABLE venue_bookings
ADD COLUMN package_id UUID;

-- Add package_id to resource_requests
ALTER TABLE resource_requests
ADD COLUMN package_id UUID;

-- Create indexes for package queries
CREATE INDEX idx_venue_bookings_package_id ON venue_bookings(package_id);
CREATE INDEX idx_resource_requests_package_id ON resource_requests(package_id);

-- Add comments
COMMENT ON COLUMN venue_bookings.package_id IS 'Groups multiple venue bookings into one package request. NULL for legacy single bookings.';
COMMENT ON COLUMN resource_requests.package_id IS 'Groups multiple resource requests into one package request. NULL for legacy single requests.';
