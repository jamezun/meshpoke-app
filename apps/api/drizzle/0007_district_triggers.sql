-- district auto-assignment: venues and spots get district_id from their geometry via ST_Contains
CREATE OR REPLACE FUNCTION assign_district() RETURNS trigger AS $$
DECLARE
  d record;
BEGIN
  IF TG_TABLE_NAME = 'venues' THEN
    FOR d IN SELECT id FROM districts WHERE ST_Contains(boundary::geometry, NEW.location::geometry) LOOP
      NEW.district_id := d.id;
      RETURN NEW;
    END LOOP;
  ELSE
    IF NEW.venue_id IS NOT NULL THEN
      SELECT v.district_id INTO NEW.district_id FROM venues v WHERE v.id = NEW.venue_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_district_trigger
  BEFORE INSERT OR UPDATE OF location ON venues
  FOR EACH ROW EXECUTE FUNCTION assign_district();

-- spots: district follows venue pin when present (creator-supplied district anchor survives while forming)
CREATE TRIGGER spots_district_trigger
  BEFORE INSERT OR UPDATE OF venue_id ON spots
  FOR EACH ROW EXECUTE FUNCTION assign_district();
