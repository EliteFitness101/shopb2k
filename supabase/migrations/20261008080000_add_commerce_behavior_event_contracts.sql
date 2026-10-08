insert into public.resofit_event_contracts (event_name, contract_version, description, required_fields, critical)
values
('commerce.search','1.0','A visitor searched for a product, accessory, gear or wellness offer.',array['query'],false),
('commerce.product_viewed','1.0','A visitor viewed a commerce product or offer.',array[],false),
('commerce.product_clicked','1.0','A visitor clicked a commerce product or recommendation.',array[],false),
('commerce.compare','1.0','A visitor compared commerce products or offers.',array[],false),
('commerce.price_filtered','1.0','A visitor applied a commerce price filter.',array[],false),
('commerce.wishlist_added','1.0','An authenticated customer saved a commerce product to a wishlist.',array['sku'],true),
('commerce.wishlist_removed','1.0','An authenticated customer removed a commerce product from a wishlist.',array['sku'],false),
('commerce.cart_added','1.0','A visitor added a commerce product to cart.',array['sku'],true)
on conflict (event_name, contract_version) do update
set description=excluded.description, required_fields=excluded.required_fields, critical=excluded.critical, updated_at=now();