-- Ultra was never sold; fold any stray ULTRA rows into PLUS and drop ULTRA
-- from the tier check constraint. Must run before the enum change deploys:
-- a lingering 'ULTRA' row would break @Enumerated(STRING) entity loading.
UPDATE app_user SET tier = 'PLUS' WHERE tier = 'ULTRA';

ALTER TABLE app_user DROP CONSTRAINT app_user_tier_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_tier_check
    CHECK (tier IN ('BASIC', 'PLUS'));
