-- Same numbers as src/data/seed.ts. Edit both together until the app is reading Supabase only.

insert into pot (id, balance_pence, cap_pence, bans, allow_skus, sizes, past_orders)
values (
  'home',
  4000,
  1500,
  array['alcohol'],
  array[]::text[],
  array['M'],
  '[
    {"sku":"NOODLE","name":"midnight noodles"},
    {"sku":"COFFEE","name":"home coffee"}
  ]'::jsonb
)
on conflict (id) do update set
  balance_pence = excluded.balance_pence,
  cap_pence = excluded.cap_pence,
  bans = excluded.bans,
  allow_skus = excluded.allow_skus,
  sizes = excluded.sizes,
  past_orders = excluded.past_orders;

insert into catalog (sku, name, price_pence, tags) values
  ('NOODLE', 'midnight noodles', 240, array['treat']),
  ('CHOC', 'salted chocolate', 450, array['treat']),
  ('TULIP', 'five tulips', 700, array['flowers']),
  ('COFFEE', 'home coffee', 620, array['treat']),
  ('CANDLE', 'kitchen candle', 800, array['home']),
  ('SOCKS', 'thick socks', 900, array['clothes', 'size:M']),
  ('WINE', 'red wine', 1100, array['alcohol']),
  ('RANUN', 'ranunculus', 1800, array['flowers']),
  ('JUMPER', 'heavy jumper', 3200, array['clothes', 'size:M'])
on conflict (sku) do update set
  name = excluded.name,
  price_pence = excluded.price_pence,
  tags = excluded.tags;
