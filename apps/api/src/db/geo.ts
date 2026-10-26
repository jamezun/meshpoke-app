import { customType } from 'drizzle-orm/pg-core';

/** PostGIS geography(Point,4326) — WKB hex string at the driver boundary. */
export const geographyPoint = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return 'geography(Point,4326)';
  },
  toDriver(value: string): Buffer {
    return Buffer.from(value, 'hex');
  },
  fromDriver(value: Buffer): string {
    return value.toString('hex');
  },
});

/** PostGIS geography(MultiPolygon,4326). */
export const geographyMultiPolygon = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return 'geography(MultiPolygon,4326)';
  },
  toDriver(value: string): Buffer {
    return Buffer.from(value, 'hex');
  },
  fromDriver(value: Buffer): string {
    return value.toString('hex');
  },
});
