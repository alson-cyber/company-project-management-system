-- Runs once, when the development volume is first initialised.
-- The integration test suite uses a separate database so it can reset data freely.
CREATE DATABASE pms_test OWNER pms;
