ALTER TABLE StoreOrders
  MODIFY status ENUM(
    'pending',
    'accepted',
    'preparing',
    'out_for_delivery',
    'approved',
    'rejected',
    'ready_for_pickup',
    'picked_up',
    'delivered',
    'cancelled'
  ) NOT NULL DEFAULT 'pending';

UPDATE StoreOrders SET status='approved' WHERE status='accepted';
UPDATE StoreOrders SET status='ready_for_pickup' WHERE status='preparing';
UPDATE StoreOrders SET status='picked_up' WHERE status='out_for_delivery';

ALTER TABLE StoreOrders
  MODIFY status ENUM(
    'pending',
    'approved',
    'rejected',
    'ready_for_pickup',
    'picked_up',
    'delivered',
    'cancelled'
  ) NOT NULL DEFAULT 'pending';
