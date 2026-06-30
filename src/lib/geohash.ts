const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function getBits(hash: string): string {
  let bits = '';
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) return bits;
    bits += idx.toString(2).padStart(5, '0');
  }
  return bits;
}

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let even = true;

  while (hash.length < precision) {
    bit = (bit << 1) | (even
      ? ((minLng + maxLng) / 2 <= lng ? 1 : 0)
      : ((minLat + maxLat) / 2 <= lat ? 1 : 0));

    if (even) {
      if ((minLng + maxLng) / 2 <= lng) minLng = (minLng + maxLng) / 2;
      else maxLng = (minLng + maxLng) / 2;
    } else {
      if ((minLat + maxLat) / 2 <= lat) minLat = (minLat + maxLat) / 2;
      else maxLat = (minLat + maxLat) / 2;
    }

    even = !even;
    if (!even) {
      hash += BASE32[bit];
      bit = 0;
    }
  }
  return hash;
}

export function decodeGeohash(hash: string): { lat: number; lng: number } {
  const bits = getBits(hash);
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;

  for (let i = 0; i < bits.length; i++) {
    if (i % 2 === 0) {
      if (bits[i] === '1') minLng = (minLng + maxLng) / 2;
      else maxLng = (minLng + maxLng) / 2;
    } else {
      if (bits[i] === '1') minLat = (minLat + maxLat) / 2;
      else maxLat = (minLat + maxLat) / 2;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };
}

export function geohashBoundingBox(hash: string): {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
} {
  const bits = getBits(hash);
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;

  for (let i = 0; i < bits.length; i++) {
    if (i % 2 === 0) {
      if (bits[i] === '1') minLng = (minLng + maxLng) / 2;
      else maxLng = (minLng + maxLng) / 2;
    } else {
      if (bits[i] === '1') minLat = (minLat + maxLat) / 2;
      else maxLat = (minLat + maxLat) / 2;
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function getGeohashRange(
  lat: number,
  lng: number,
  radiusKm: number
): { start: string; end: string } {
  const kmPerDegree = 111.32;
  const latDelta = radiusKm / kmPerDegree;
  const lngDelta = radiusKm / (kmPerDegree * Math.cos((lat * Math.PI) / 180));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  const precision = radiusKm <= 2 ? 7 : radiusKm <= 10 ? 6 : radiusKm <= 40 ? 5 : radiusKm <= 200 ? 4 : 3;

  const startHash = encodeGeohash(maxLat, minLng, precision);
  const endHash = encodeGeohash(minLat, maxLng, precision);

  return { start: startHash, end: endHash };
}
