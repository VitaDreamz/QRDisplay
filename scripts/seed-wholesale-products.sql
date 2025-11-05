-- Run this in Vercel Postgres Storage SQL tab
-- This adds all wholesale box products to production

-- First, get the VitaDreamz orgId (should be ORG-VITADREAMZ)

-- Insert 30ct boxes (8 units per box)
INSERT INTO products (sku, name, description, category, price, msrp, "imageUrl", active, featured, "productType", "unitsPerBox", "wholesalePrice", "retailPrice", "orgId")
VALUES 
('VD-SB-30-BX', 'Slumber Berry - 30ct Box', 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 8)', 'Sleep', 29.99, 29.99, '/images/products/30ct-SlumberBerry-BOXof8.jpg', true, false, 'wholesale-box', 8, 160.00, 239.92, 'ORG-VITADREAMZ'),
('VD-BB-30-BX', 'Bliss Berry - 30ct Box', 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 8)', 'Relax', 24.99, 24.99, '/images/products/30ct-BlissBerry-BOXof8.jpg', true, false, 'wholesale-box', 8, 128.00, 199.92, 'ORG-VITADREAMZ')
ON CONFLICT (sku) DO NOTHING;

-- Insert 60ct boxes (6 units per box)
INSERT INTO products (sku, name, description, category, price, msrp, "imageUrl", active, featured, "productType", "unitsPerBox", "wholesalePrice", "retailPrice", "orgId")
VALUES 
('VD-SB-60-BX', 'Slumber Berry - 60ct Box', 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 6)', 'Sleep', 54.99, 54.99, '/images/products/60ct-SlumberBerry-BOXof6.jpg', true, false, 'wholesale-box', 6, 210.00, 329.94, 'ORG-VITADREAMZ'),
('VD-BB-60-BX', 'Bliss Berry - 60ct Box', 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 6)', 'Relax', 44.99, 44.99, '/images/products/60ct-BlissBerry-BOXof6.jpg', true, false, 'wholesale-box', 6, 168.00, 269.94, 'ORG-VITADREAMZ')
ON CONFLICT (sku) DO NOTHING;

-- Insert Berry Chill 20ct box
INSERT INTO products (sku, name, description, category, price, msrp, "imageUrl", active, featured, "productType", "unitsPerBox", "wholesalePrice", "retailPrice", "orgId")
VALUES 
('VD-CC-20-BX', 'Berry Chill - 20ct Box', 'D9 THC + Herbals - ChillOut Chewz (Box of 10)', 'ChillOut', 24.95, 24.95, '/images/products/20ct-ChillOut Chewz-Bag.png', true, false, 'wholesale-box', 10, 150.00, 249.50, 'ORG-VITADREAMZ')
ON CONFLICT (sku) DO NOTHING;

-- Insert 4ct boxes (20 units per box)
INSERT INTO products (sku, name, description, category, price, msrp, "imageUrl", active, featured, "productType", "unitsPerBox", "wholesalePrice", "retailPrice", "orgId")
VALUES 
('VD-SB-4-BX', 'Slumber Berry - 4ct Box', 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 20)', 'Sleep', 4.99, 4.99, '/images/products/4ct-SlumberBerry-Bag.png', true, false, 'wholesale-box', 20, 45.00, 99.80, 'ORG-VITADREAMZ'),
('VD-BB-4-BX', 'Bliss Berry - 4ct Box', 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 20)', 'Relax', 3.99, 3.99, '/images/products/4ct-BlissBerry-Bag.png', true, false, 'wholesale-box', 20, 40.00, 79.80, 'ORG-VITADREAMZ'),
('VD-CC-4-BX', 'Berry Chill - 4ct Box', 'D9 THC + Herbals - ChillOut Chewz (Box of 20)', 'ChillOut', 5.99, 5.99, '/images/products/20ct-ChillOut Chewz-Bag.png', true, false, 'wholesale-box', 20, 54.00, 119.80, 'ORG-VITADREAMZ')
ON CONFLICT (sku) DO NOTHING;

-- Verify the inserts
SELECT sku, name, "productType", "unitsPerBox", "wholesalePrice", "retailPrice" 
FROM products 
WHERE "productType" = 'wholesale-box'
ORDER BY sku;
