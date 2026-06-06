-- Convert stored full S3 URLs into bare S3 keys for every image column.
-- The objects stay in S3 untouched; only the DB value changes, so users keep
-- their pictures with zero re-upload. Images are now served via presigned GET
-- urls minted by the backend from these keys.
--
-- TAKE AN RDS SNAPSHOT BEFORE THIS MIGRATION RUNS.
--
-- Idempotent: only rows that still look like a URL ('http%') are touched, and
-- only when they contain a recognized key prefix. The parser anchors on the
-- known key prefixes ('profile-pictures/', 'workout-photos/') rather than the
-- host, so it tolerates any of the S3 host formats (virtual-hosted with/without
-- region, path-style) and strips the '?v=...' query suffix on profile urls.
-- Rows that do not match any known prefix are LEFT UNCHANGED and reported as a
-- warning rather than corrupted.

-- Profile pictures -> gear-fitness-profile-pictures (key prefix 'profile-pictures/')
UPDATE app_user
SET profile_picture_url =
  substring(split_part(profile_picture_url, '?', 1) FROM 'profile-pictures/.*$')
WHERE profile_picture_url LIKE 'http%'
  AND split_part(profile_picture_url, '?', 1) LIKE '%profile-pictures/%';

-- Post images -> gear-fitness-images (key prefix 'workout-photos/')
UPDATE post
SET image_url =
  substring(split_part(image_url, '?', 1) FROM 'workout-photos/.*$')
WHERE image_url LIKE 'http%'
  AND split_part(image_url, '?', 1) LIKE '%workout-photos/%';

-- Workout photos -> gear-fitness-images (key prefix 'workout-photos/')
UPDATE workout_photo_url
SET photo_url =
  substring(split_part(photo_url, '?', 1) FROM 'workout-photos/.*$')
WHERE photo_url LIKE 'http%'
  AND split_part(photo_url, '?', 1) LIKE '%workout-photos/%';

-- Report any URL-looking rows that could not be converted (left unchanged).
DO $$
DECLARE
  unmatched_profiles INT;
  unmatched_posts INT;
  unmatched_workout_photos INT;
BEGIN
  SELECT count(*) INTO unmatched_profiles
    FROM app_user WHERE profile_picture_url LIKE 'http%';
  SELECT count(*) INTO unmatched_posts
    FROM post WHERE image_url LIKE 'http%';
  SELECT count(*) INTO unmatched_workout_photos
    FROM workout_photo_url WHERE photo_url LIKE 'http%';

  IF unmatched_profiles > 0 THEN
    RAISE WARNING 'V18: % app_user.profile_picture_url row(s) still look like URLs and were left unchanged', unmatched_profiles;
  END IF;
  IF unmatched_posts > 0 THEN
    RAISE WARNING 'V18: % post.image_url row(s) still look like URLs and were left unchanged', unmatched_posts;
  END IF;
  IF unmatched_workout_photos > 0 THEN
    RAISE WARNING 'V18: % workout_photo_url.photo_url row(s) still look like URLs and were left unchanged', unmatched_workout_photos;
  END IF;
END $$;
