import { useCart } from '../context/CartContext';
import { useAbandonedCartReminder } from '../hooks/useAbandonedCartReminder';

export default function AbandonedCartWatcher() {
  const { items } = useCart();
  useAbandonedCartReminder(items.length);
  return null;
}
