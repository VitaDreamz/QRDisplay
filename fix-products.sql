-- Run this against the paid database to check/fix products
-- Connection: postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres

-- 1. Check what exists
SELECT 'ORGANIZATIONS' as table_name, COUNT(*) FROM organizations
UNION ALL
SELECT 'PRODUCTS', COUNT(*) FROM products;

-- 2. Check products detail
SELECT sku, name, "orgId", "productType", active FROM products ORDER BY sku;

-- 3. If products are missing or wrong, delete and recreate them:
DELETE FROM products;

-- Slumber products
INSERT INTO products (id, sku, name, description, price, "productType", "orgId", "createdAt", "updatedAt", active, category) VALUES
('p-slumber-4ct', 'VD-SB-4', '4ct - Slumber Berry Sleep Gummies', 'CBD + Melatonin & Herbals', 4.99, 'sample', 'cmi-slumber', NOW(), NOW(), true, 'Sleep'),
('p-slumber-30ct', 'VD-SB-30', '30ct - Slumber Berry Sleep Gummies', 'CBD + Melatonin & Herbals', 29.99, 'retail', 'cmi-slumber', NOW(), NOW(), true, 'Sleep'),
('p-slumber-60ct', 'VD-SB-60', '60ct - Slumber Berry Sleep Gummies', 'CBD + Melatonin & Herbals', 54.99, 'retail', 'cmi-slumber', NOW(), NOW(), true, 'Sleep');

-- Bliss products  
INSERT INTO products (id, sku, name, description, price, "productType", "orgId", "createdAt", "updatedAt", active, category) VALUES
('p-bliss-4ct', 'VD-BB-4', '4ct - Bliss Berry Sleep Gummies', 'Magnesium + Herbals', 4.99, 'sample', 'cmi-bliss', NOW(), NOW(), true, 'Sleep'),
('p-bliss-30ct', 'VD-BB-30', '30ct - Bliss Berry Sleep Gummies', 'Magnesium + Herbals', 29.99, 'retail', 'cmi-bliss', NOW(), NOW(), true, 'Sleep'),
('p-bliss-60ct', 'VD-BB-60', '60ct - Bliss Berry Sleep Gummies', 'Magnesium + Herbals', 54.99, 'retail', 'cmi-bliss', NOW(), NOW(), true, 'Sleep');

-- Chill products
INSERT INTO products (id, sku, name, description, price, "productType", "orgId", "createdAt", "updatedAt", active, category) VALUES
('p-chill-4ct', 'VD-CC-4', '4ct - Chill Cherry Relax Gummies', 'D9 THC + Herbals', 4.99, 'sample', 'cmi-chill', NOW(), NOW(), true, 'Relax'),
('p-chill-20ct', 'VD-CC-20', '20ct - Chill Cherry Relax Gummies', 'D9 THC + Herbals', 19.99, 'retail', 'cmi-chill', NOW(), NOW(), true, 'Relax'),
('p-chill-60ct', 'VD-CC-60', '60ct - Chill Cherry Relax Gummies', 'D9 THC + Herbals', 54.99, 'retail', 'cmi-chill', NOW(), NOW(), true, 'Relax');

-- Verify
SELECT 'FINAL COUNT' as status, COUNT(*) as products FROM products;
