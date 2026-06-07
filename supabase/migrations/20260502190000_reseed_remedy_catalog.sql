insert into public.remedy_catalog (
  remedy_key,
  remedy_type,
  title,
  simple_line,
  applicable_planets,
  applicable_purposes,
  is_active
)
values
  (
    'quiet_journal_10',
    'behavioral',
    'Ten-minute honest note',
    'Write what actually happened this week without judging it. Clarity comes from naming reality.',
    array[]::text[],
    array['career_interview','money_talk','family_discussion']::text[],
    true
  ),
  (
    'breath_before_words',
    'behavioral',
    'Breath before words',
    'Three slow breaths before a hard conversation keeps tone from running ahead of intent.',
    array['Moon','Mercury']::text[],
    array['relationship_marriage_talk','family_discussion','money_talk']::text[],
    true
  ),
  (
    'early_sleep_window',
    'discipline',
    'Earlier sleep for three nights',
    'If timing feels edgy, give your nervous system three calmer nights so small logistics errors shrink.',
    array['Moon','Saturn']::text[],
    array['health_routine','study_exam']::text[],
    true
  ),
  (
    'small_charity_food',
    'charity',
    'Quiet food support',
    'Anonymous help with a simple meal anchors the day in proportion and reduces grasping.',
    array['Jupiter','Venus']::text[],
    array['money_talk','business_launch']::text[],
    true
  ),
  (
    'walk_after_sunrise',
    'behavioral',
    'Walk after sunrise',
    'A steady walk after sunrise with no phone tends to reorder the day without drama.',
    array['Sun','Jupiter']::text[],
    array['career_interview','study_exam','travel']::text[],
    true
  ),
  (
    'simplify_one_commitment',
    'behavioral',
    'Simplify one commitment',
    'Drop or postpone one non-essential promise so the important thing gets clean attention.',
    array['Saturn','Mars']::text[],
    array['business_launch','legal_dispute','property_vehicle']::text[],
    true
  )
on conflict (remedy_key) do update
set
  remedy_type = excluded.remedy_type,
  title = excluded.title,
  simple_line = excluded.simple_line,
  applicable_planets = excluded.applicable_planets,
  applicable_purposes = excluded.applicable_purposes,
  is_active = excluded.is_active;
