-- T13.4: widen reports.reason for moderation notes
ALTER TABLE reports ALTER COLUMN reason TYPE varchar(200);
