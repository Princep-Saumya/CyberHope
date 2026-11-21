import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocationCoordinates } from './mapCoordinates.js';

test('keeps explicitly verified coordinates unchanged', () => {
  const result = getLocationCoordinates({
    coordinates: { lat: 25.61, lng: 85.14 },
    coordinates_approximate: false,
    location_tagged: 'Kankarbagh, Patna',
  });

  assert.deepEqual(result, {
    coordinates: [25.61, 85.14],
    precision: 'verified',
    label: 'Kankarbagh, Patna',
  });
});

test('uses approximate locality coordinates instead of an old district-center fallback', () => {
  const result = getLocationCoordinates({
    id: 'bihta-report',
    coordinates: { lat: 25.6093, lng: 85.1235 },
    coordinates_approximate: true,
    location_tagged: 'Bihta, Patna',
  });

  assert.deepEqual(result, {
    coordinates: [25.5622, 84.8701],
    precision: 'approximate-locality',
    label: 'Bihta',
  });
});

test('does not trust legacy demo-seed coordinates marked as exact', () => {
  const result = getLocationCoordinates({
    id: 'legacy-kankarbagh-seed',
    data_origin: 'demo-seed',
    coordinates: { lat: 25.6093, lng: 85.1235 },
    coordinates_approximate: false,
    location_tagged: 'Patna',
    post_text: 'Kankarbagh Main Road has large potholes',
  });

  assert.deepEqual(result, {
    coordinates: [25.5941, 85.1456],
    precision: 'approximate-locality',
    label: 'Kankarbagh',
  });
});

test('resolves requested Hindi locality names from post text', () => {
  const result = getLocationCoordinates({
    id: 'kankarbagh-hindi',
    coordinates_approximate: true,
    location_tagged: 'Location unverified',
    post_text: 'कंकड़बाग में सड़क पर बड़ा गड्ढा',
  });

  assert.equal(result.precision, 'approximate-locality');
  assert.deepEqual(result.coordinates, [25.5941, 85.1456]);
});

test('resolves requested localities from English labels', () => {
  const rajendraNagar = getLocationCoordinates({
    id: 'rajendra-nagar',
    location_tagged: 'Rajendra Nagar, Patna',
    coordinates_approximate: true,
  });
  const bagaha = getLocationCoordinates({
    id: 'bagaha',
    location_tagged: 'Location unverified',
    post_text: 'Gandak River reaches a record at Bagaha gauge',
    coordinates_approximate: true,
  });

  assert.deepEqual(rajendraNagar.coordinates, [25.6121, 85.1662]);
  assert.equal(rajendraNagar.precision, 'approximate-locality');
  assert.deepEqual(bagaha.coordinates, [27.099, 84.091]);
  assert.equal(bagaha.precision, 'approximate-locality');
  assert.equal(bagaha.label, 'Bagaha');
});

test('uses deterministic district-level offsets and marks them approximate', () => {
  const report = {
    id: 'district-only-araria',
    location_tagged: 'Araria',
    coordinates_approximate: true,
  };
  const result = getLocationCoordinates(report);

  assert.deepEqual(result, getLocationCoordinates(report));
  assert.equal(result.precision, 'approximate-district');
  assert.equal(result.label, 'Araria');
  assert.ok(Math.abs(result.coordinates[0] - 26.1511) <= 0.015);
  assert.ok(Math.abs(result.coordinates[1] - 87.5144) <= 0.015);
});

test('omits reports without a resolvable location', () => {
  assert.equal(getLocationCoordinates({
    id: 'unlocated',
    location_tagged: 'Location unverified',
    coordinates: { lat: 25.6093, lng: 85.1235 },
    coordinates_approximate: true,
    post_text: 'A complaint without any place name',
  }), null);
});
