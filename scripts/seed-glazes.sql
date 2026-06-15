-- Sheila's current glaze buckets, transcribed from the handwritten inventory
-- photos (2026-06-15). One-time load: paste into Neon's SQL Editor (branch: main).
--
-- volume_ml is written as `amount * mL-per-unit` so the math is auditable and
-- matches src/lib/units.ts (cup 236.588, quart 946.353, gallon 3785.41).
-- recipe_id is left NULL — link a recipe later from each glaze's edit screen.
-- Entries marked "verify" below were hard to read; fix the name/amount in the app.

INSERT INTO glazes (name, display_volume_unit, volume_ml, status, notes) VALUES
  ('Trans Green (Extra Light)',            'quart',  1   * 946.353, NULL,     'A bit over 1 qt'),
  ('Chun Celadon (copper + cobalt)',       'quart',  1   * 946.353, NULL,     NULL),
  ('SCM Cool',                             'quart',  2.5 * 946.353, NULL,     NULL),
  ('Satin White (test 7/1/2019)',          'cup',    2   * 236.588, 'Chunky', NULL),
  ('Frost Green',                          'quart',  2.5 * 946.353, NULL,     NULL),
  ('Crowd Red Orange (Pioneer Tale)',      'quart',  2.5 * 946.353, NULL,     NULL),
  ('#1 Hanlie (lg cT talc)',               'cup',    1.5 * 236.588, NULL,     'Approx 1.5 cup; verify name'),
  ('Mint w/ Pioneer Talc',                 'gallon', 0.5 * 3785.41, NULL,     NULL),
  ('TJ''s Satin Clear (Satin)',            'cup',    1   * 236.588, NULL,     'Verify amount'),
  ('TJ''s Satin Clear w/ cobalt + copper', 'quart',  1.5 * 946.353, NULL,     'Test batch'),
  ('Mint Green / Pioneer Tale',            'quart',  0,             NULL,     'No amount written; "is it white?" — verify'),
  ('Hannah Blue Ash',                      'cup',    2   * 236.588, NULL,     NULL),
  ('Carmens Turquoise',                    'cup',    2   * 236.588, NULL,     'Verify name'),
  ('Copper Ash',                           'quart',  1.5 * 946.353, 'Dryish', NULL),
  ('Satin White (test 3)',                 'quart',  1.5 * 946.353, NULL,     NULL),
  ('Yellow Mint Green',                    'cup',    3   * 236.588, 'Dryish', NULL),
  ('Apricot',                              'quart',  1.3 * 946.353, 'Dryish', 'Almost dry'),
  ('Dark Mint Matte (test)',               'cup',    3   * 236.588, 'Dryish', NULL),
  ('Britt Boo F (Blue/Green, water alc)',  'cup',    3.5 * 236.588, NULL,     '3-4 cups; verify name'),
  ('Chun Celadon (test)',                  'cup',    3.5 * 236.588, 'Dryish', '3-4 cups'),
  ('Dark Mint',                            'gallon', 1   * 3785.41, NULL,     NULL),
  ('Juicy Frost Copper',                   'quart',  2   * 946.353, NULL,     NULL),
  ('O''Lasey Clear Gloss',                 'quart',  0.75 * 946.353, NULL,    'Verify name'),
  ('Clayworks RO',                         'cup',    2   * 236.588, 'Dryish', 'Verify name'),
  ('Mint Green Pioneer Tale',              'quart',  0,             'Empty',  NULL),
  ('Dark Mint (test)',                     'cup',    3   * 236.588, NULL,     'Approx 3 cup');
