-- E-COM-OS Seed Data
-- Replace this UUID with an existing auth.users id in your project.
-- Example: select id from auth.users limit 1;

with params as (
  select '655f7167-5449-43ae-ac2a-3df21d2b3d3f'::uuid as seed_user
)
insert into public.products (user_id, name, product_cost, shipping_cost, cpa_estimated, sale_price)
select seed_user, 'Posture Corrector Pro', 8.00, 4.50, 12.00, 39.90 from params
union all
select seed_user, 'Mini Blender Go', 11.20, 5.10, 14.00, 49.00 from params;

with params as (
  select '655f7167-5449-43ae-ac2a-3df21d2b3d3f'::uuid as seed_user
)
insert into public.checklist_tasks (user_id, title, category, is_critical, assignee, sort_order)
select seed_user, 'Marge nette valide', 'Research', true, 'Associate A', 1 from params
union all select seed_user, 'ROAS seuil calcule', 'Research', true, 'Associate B', 2 from params
union all select seed_user, 'Commande test reelle', 'Technical', true, 'Associate A', 3 from params
union all select seed_user, 'Pixel + CAPI Purchase OK', 'Technical', true, 'Associate B', 4 from params
union all select seed_user, 'Vitesse mobile < 2s', 'Technical', true, 'Associate A', 5 from params
union all select seed_user, 'Hook 3 secondes valide', 'Creatives', false, 'Associate B', 6 from params
union all select seed_user, 'Bundle x2 attractif', 'Shop', false, 'Associate A', 7 from params
union all select seed_user, 'FAQ + politique retour claire', 'Shop', false, 'Associate B', 8 from params;

with params as (
  select '3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591'::uuid as seed_user
)
insert into public.competitors (user_id, brand_name, niche, store_url, ad_library_url, marketing_angle, observations, threat_score)
select seed_user, 'GlowSculpt', 'Beauty', 'https://glowsculpt.co', 'https://facebook.com/ads/library/?q=glowsculpt', 'UGC avant/apres + social proof', 'Forte pression promo weekend', 82 from params
union all
select seed_user, 'PawLift', 'Pet', 'https://pawlift.com', 'https://facebook.com/ads/library/?q=pawlift', 'Pain point + demo produit rapide', 'Bon CPA sur creatives statiques', 67 from params;

with params as (
  select '655f7167-5449-43ae-ac2a-3df21d2b3d3f'::uuid as seed_user
)
insert into public.campaigns (id, user_id, platform, name, budget, roas, status)
select '22222222-2222-2222-2222-222222222221'::uuid, seed_user, 'Meta', 'Broad FR 18-44', 180, 2.90, 'active' from params
union all
select '22222222-2222-2222-2222-222222222222'::uuid, seed_user, 'TikTok', 'UGC Test 03', 90, 1.40, 'testing' from params;

with params as (
  select '3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591'::uuid as seed_user
)
insert into public.scaling_logs (user_id, campaign_id, decision, note, author)
select seed_user, '22222222-2222-2222-2222-222222222221'::uuid, 'Increase Budget', '+20% budget suite ROAS > 2.8 sur 3 jours', 'Associate A' from params
union all
select seed_user, '22222222-2222-2222-2222-222222222222'::uuid, 'Test New Angle', 'Tester hook problem-solution avec preuve produit', 'Associate B' from params;

with params as (
  select '655f7167-5449-43ae-ac2a-3df21d2b3d3f'::uuid as seed_user
)
insert into public.cashflow_entries (user_id, entry_type, label, amount, entry_date)
select seed_user, 'inflow', 'Ventes Shopify', 3260, '2026-03-14'::date from params
union all
select seed_user, 'outflow', 'Ads Meta', 980, '2026-03-14'::date from params
union all
select seed_user, 'outflow', 'Fournisseur', 740, '2026-03-15'::date from params
union all
select seed_user, 'inflow', 'Ventes TikTok Shop', 1850, '2026-03-16'::date from params;

with params as (
  select '3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591'::uuid as seed_user
)
insert into public.alerts (user_id, title, description, severity)
select seed_user, 'CPA en hausse', 'Le CPA moyen est en hausse de 14% sur les 48 dernieres heures.', 'warning' from params
union all
select seed_user, 'Pixel Purchase manquant', 'Bloqueur pre-launch detecte sur Pixel/CAPI.', 'critical' from params;

insert into public.checklist_task_validations (user_id, checklist_task_id, validated_by, notes)
select t.user_id, t.id, 'Associate A', 'Validation initiale seed'
from public.checklist_tasks t
where t.title in ('Marge nette valide', 'ROAS seuil calcule');
