import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supplyApi } from '../api/supply';
import { produceApi } from '../api/produce';
import { getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import type { DeliveryMethod, PaymentMethod, SupplyProduct } from '../types/supply';

interface CartItem {
  product: SupplyProduct;
  quantity: number;
}

interface ProduceCartItem {
  id: string;
  listing: any;
  quantity: number;
}

const categoryImages: Record<string, string> = {
  fertilizer: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
  pesticide_herbicide_fungicide: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
  seeds_seedlings: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
  animal_feeds: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
  vet_medicines: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
  irrigation: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=600&q=80',
  machinery_equipment: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80',
  nursery_greenhouse: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
  packaging_storage: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=600&q=80',
  tools: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80',
  ppe: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
};

const getCropImageFallback = (cropName: string = ''): string => {
  const c = cropName.toLowerCase();
  if (c.includes('corn') || c.includes('mais')) return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80';
  if (c.includes('rice') || c.includes('palay') || c.includes('bugas') || c.includes('dinorado')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
  if (c.includes('tomato') || c.includes('kamatis')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
  if (c.includes('mango') || c.includes('mangga')) return 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80';
  if (c.includes('banana') || c.includes('saging')) return 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80';
  if (c.includes('potato') || c.includes('patatas') || c.includes('cassava') || c.includes('kamote')) return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80';
  if (c.includes('onion') || c.includes('sibuyas')) return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80';
  if (c.includes('cabbage') || c.includes('lettuce') || c.includes('pechay')) return 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
  if (c.includes('eggplant') || c.includes('talong')) return 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
  if (c.includes('chili') || c.includes('sili')) return 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80';
  return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
};

// Payment options config — easy to enable/disable as gateways go live.
const getPaymentOptions = (isPickup: boolean): {
  id: PaymentMethod;
  label: string;
  icon: string;
  desc: string;
  comingSoon?: boolean;
}[] => [
    {
      id: 'cod',
      label: isPickup ? 'Cash on Pickup' : 'Cash on Delivery',
      icon: '💵',
      desc: isPickup ? 'Pay in cash upon in-store collection.' : 'Pay in cash when your order arrives.',
    },
    {
      id: 'gcash',
      label: 'GCash',
      icon: '📱',
      desc: 'Send via GCash e-wallet.',
      comingSoon: true,
    },
    {
      id: 'maya',
      label: 'Maya',
      icon: '💜',
      desc: 'Pay with Maya (formerly PayMaya).',
      comingSoon: true,
    },
    {
      id: 'bank_transfer',
      label: 'Bank Transfer',
      icon: '🏦',
      desc: 'InstaPay / PESONet transfer.',
      comingSoon: true,
    },
    {
      id: 'card',
      label: 'Credit / Debit Card',
      icon: '💳',
      desc: 'Visa, Mastercard via secure gateway.',
      comingSoon: true,
    },
  ];

export const SupplyCartPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tabs: 'supplies' or 'produce'
  const [activeTab, setActiveTab] = useState<'supplies' | 'produce'>('supplies');

  // Supplies Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<Set<string>>(new Set());

  // Produce Cart State
  const [produceCart, setProduceCart] = useState<ProduceCartItem[]>([]);
  const [selectedProduceIds, setSelectedProduceIds] = useState<Set<string>>(new Set());

  // Checkout Form States
  const userAddr = user ? [user.barangay, user.municipality, user.province].filter(Boolean).join(', ') || user.address || '' : '';
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(userAddr);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  const [ordering, setOrdering] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  const isInternalUpdate = useRef(false);

  const loadCart = (isInitial: boolean = false) => {
    // 1. Load supplies cart
    const rawSupply = localStorage.getItem('agriconnect_cart');
    if (rawSupply) {
      try {
        const parsed: CartItem[] = JSON.parse(rawSupply);
        const validItems = Array.isArray(parsed) ? parsed.filter((i) => i?.product?.id && (i.quantity || 0) > 0) : [];
        if (validItems.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
          localStorage.setItem('agriconnect_cart', JSON.stringify(validItems));
        }
        setCart(validItems);
        setSelectedSupplyIds((prev) => {
          if (isInitial) {
            return new Set(validItems.map((i) => i.product.id));
          }
          // Preserve user's existing selections for items that still exist in cart
          const validIds = new Set(validItems.map((i) => i.product.id));
          const retained = new Set<string>();
          prev.forEach((id) => {
            if (validIds.has(id)) retained.add(id);
          });
          return retained;
        });
      } catch {
        setCart([]);
      }
    } else {
      setCart([]);
      setSelectedSupplyIds(new Set());
    }

    // 2. Load produce cart
    const rawProduce = localStorage.getItem('agriconnect_produce_cart');
    if (rawProduce) {
      try {
        const parsedProduce: ProduceCartItem[] = JSON.parse(rawProduce);
        const validProduce = Array.isArray(parsedProduce) ? parsedProduce.filter((i) => i?.id && (i.quantity || 0) > 0) : [];
        if (validProduce.length !== (Array.isArray(parsedProduce) ? parsedProduce.length : 0)) {
          localStorage.setItem('agriconnect_produce_cart', JSON.stringify(validProduce));
        }
        setProduceCart(validProduce);
        setSelectedProduceIds((prev) => {
          if (isInitial) {
            return new Set(validProduce.map((i) => i.id));
          }
          // Preserve user's existing selections for items that still exist in produce cart
          const validIds = new Set(validProduce.map((i) => i.id));
          const retained = new Set<string>();
          prev.forEach((id) => {
            if (validIds.has(id)) retained.add(id);
          });
          return retained;
        });
      } catch {
        setProduceCart([]);
      }
    } else {
      setProduceCart([]);
      setSelectedProduceIds(new Set());
    }
  };

  // Reconcile and clamp cart quantities against live database stock
  const reconcileCartWithLiveStock = async () => {
    try {
      const rawSupply = localStorage.getItem('agriconnect_cart');
      if (rawSupply) {
        const parsed: CartItem[] = JSON.parse(rawSupply);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const freshProducts = await supplyApi.listProducts();
          if (Array.isArray(freshProducts)) {
            const productMap = new Map(freshProducts.map((p) => [p.id, p]));
            let changed = false;
            let adjustedItemName = '';
            const removedNames: string[] = [];
            const reconciled: CartItem[] = [];

            for (const item of parsed) {
              if (!item?.product?.id) {
                changed = true;
                continue;
              }
              const fresh = productMap.get(item.product.id);
              if (fresh) {
                const maxStock = Math.max(0, fresh.stockQuantity);
                const cappedQty = Math.min(item.quantity, maxStock);

                if (cappedQty !== item.quantity || fresh.stockQuantity !== item.product.stockQuantity || fresh.price !== item.product.price) {
                  changed = true;
                  adjustedItemName = fresh.name;
                }

                if (cappedQty > 0) {
                  reconciled.push({ ...item, product: fresh, quantity: cappedQty });
                } else {
                  changed = true;
                  toastWarning(
                    'Item Out of Stock',
                    `"${fresh.name}" is now out of stock and was removed from your cart.`
                  );
                }
              } else {
                // Product no longer exists in supplier inventory / database
                changed = true;
                removedNames.push(item.product?.name || 'A product');
              }
            }

            if (removedNames.length > 0) {
              toastWarning(
                'Unavailable Items Removed',
                `${removedNames.join(', ')} is no longer available from suppliers and was removed from your cart.`
              );
            }

            if (changed) {
              saveSupplyCart(reconciled);
              setSelectedSupplyIds((prev) => {
                const validIds = new Set(reconciled.map((i) => i.product.id));
                const retained = new Set<string>();
                prev.forEach((id) => {
                  if (validIds.has(id)) retained.add(id);
                });
                return retained;
              });
              if (adjustedItemName && removedNames.length === 0) {
                toastInfo(
                  'Cart Adjusted to Available Stock',
                  `Item quantity for "${adjustedItemName}" was adjusted to match current supplier stock.`
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to reconcile cart stock:', e);
    }
  };

  // Reconcile and clamp produce cart quantities against live database harvest listings
  const reconcileProduceCartWithLiveStock = async () => {
    try {
      const rawProduce = localStorage.getItem('agriconnect_produce_cart');
      if (rawProduce) {
        const parsed: ProduceCartItem[] = JSON.parse(rawProduce);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const freshListings = await produceApi.listListings();
          if (Array.isArray(freshListings)) {
            const listingMap = new Map(freshListings.map((l) => [l.id, l]));
            let changed = false;
            let adjustedCropName = '';
            const removedNames: string[] = [];
            const reconciled: ProduceCartItem[] = [];

            for (const item of parsed) {
              if (!item?.id) {
                changed = true;
                continue;
              }
              const fresh = listingMap.get(item.id);
              // Must exist, be available status, and have positive harvest quantity
              if (fresh && fresh.status === 'available' && fresh.quantity > 0) {
                const maxHarvest = Math.max(0, fresh.quantity);
                const cappedQty = Math.min(item.quantity, maxHarvest);

                if (
                  cappedQty !== item.quantity ||
                  fresh.quantity !== item.listing?.quantity ||
                  fresh.pricePerUnit !== item.listing?.pricePerUnit
                ) {
                  changed = true;
                  adjustedCropName = fresh.cropName;
                }

                if (cappedQty > 0) {
                  reconciled.push({ ...item, listing: fresh, quantity: cappedQty });
                } else {
                  changed = true;
                  removedNames.push(fresh.cropName);
                }
              } else {
                // Listing was deleted, marked sold/reserved, or has 0 quantity
                changed = true;
                const cropLabel = fresh ? `${fresh.cropName} (${fresh.status || 'out of stock'})` : (item.listing?.cropName || 'A crop listing');
                removedNames.push(cropLabel);
              }
            }

            if (removedNames.length > 0) {
              toastWarning(
                'Unavailable Crops Removed',
                `${removedNames.join(', ')} is no longer available and was removed from your cart.`
              );
            }

            if (changed) {
              saveProduceCart(reconciled);
              setSelectedProduceIds((prev) => {
                const validIds = new Set(reconciled.map((i) => i.id));
                const retained = new Set<string>();
                prev.forEach((id) => {
                  if (validIds.has(id)) retained.add(id);
                });
                return retained;
              });
              if (adjustedCropName && removedNames.length === 0) {
                toastInfo(
                  'Harvest Quantity Adjusted',
                  `Available quantity for "${adjustedCropName}" was updated.`
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to reconcile produce cart:', e);
    }
  };

  useEffect(() => {
    loadCart(true);
    reconcileCartWithLiveStock();
    reconcileProduceCartWithLiveStock();
    const handleSync = () => {
      if (isInternalUpdate.current) return;
      loadCart(false);
    };
    window.addEventListener('cart-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('cart-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Auto-switch to produce tab if supplies cart is empty but produce cart has items
  useEffect(() => {
    if (cart.length === 0 && produceCart.length > 0) {
      setActiveTab('produce');
    }
  }, [cart.length, produceCart.length]);

  // Reconcile produce whenever switching to produce tab
  useEffect(() => {
    if (activeTab === 'produce') {
      reconcileProduceCartWithLiveStock();
    } else {
      reconcileCartWithLiveStock();
    }
  }, [activeTab]);

  const saveSupplyCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('agriconnect_cart', JSON.stringify(newCart));
    isInternalUpdate.current = true;
    window.dispatchEvent(new Event('cart-updated'));
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const saveProduceCart = (newCart: ProduceCartItem[]) => {
    setProduceCart(newCart);
    localStorage.setItem('agriconnect_produce_cart', JSON.stringify(newCart));
    isInternalUpdate.current = true;
    window.dispatchEvent(new Event('cart-updated'));
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const handleUpdateSupplyQty = (productId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stockQuantity ?? 9999;
          if (delta > 0 && item.quantity >= maxStock) {
            toastWarning(
              'Stock Limit Reached',
              `Cannot add more. Only ${maxStock} ${item.product.unit || 'units'} available in stock.`
            );
            return item;
          }
          const newQty = Math.min(maxStock, item.quantity + delta);
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    saveSupplyCart(updated);
    setSelectedSupplyIds((prev) => {
      const validIds = new Set(updated.map((i) => i.product.id));
      const retained = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) retained.add(id);
      });
      return retained;
    });
  };

  const handleRemoveSupply = (productId: string) => {
    saveSupplyCart(cart.filter((i) => i.product.id !== productId));
    setSelectedSupplyIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleUpdateProduceQty = (id: string, delta: number) => {
    const updated = produceCart
      .map((item) => {
        if (item.id === id) {
          const maxHarvest = item.listing?.quantity ?? 9999;
          if (delta > 0 && item.quantity >= maxHarvest) {
            toastWarning(
              'Harvest Limit Reached',
              `Cannot add more. Only ${maxHarvest} ${item.listing?.unit || 'kg'} available.`
            );
            return item;
          }
          const newQty = Math.min(maxHarvest, item.quantity + delta);
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as ProduceCartItem[];
    saveProduceCart(updated);
    setSelectedProduceIds((prev) => {
      const validIds = new Set(updated.map((i) => i.id));
      const retained = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) retained.add(id);
      });
      return retained;
    });
  };

  const handleRemoveProduce = (id: string) => {
    saveProduceCart(produceCart.filter((i) => i.id !== id));
    setSelectedProduceIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Checkbox handlers (Shopee-style)
  const toggleSelectSupply = (id: string) => {
    setSelectedSupplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllSupplies = () => {
    if (selectedSupplyIds.size === cart.length) {
      setSelectedSupplyIds(new Set());
    } else {
      setSelectedSupplyIds(new Set(cart.map((i) => i.product.id)));
    }
  };

  const toggleSelectProduce = (id: string) => {
    setSelectedProduceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllProduce = () => {
    if (selectedProduceIds.size === produceCart.length) {
      setSelectedProduceIds(new Set());
    } else {
      setSelectedProduceIds(new Set(produceCart.map((i) => i.id)));
    }
  };

  // Calculation for SELECTED items only
  const selectedSupplyItems = cart.filter((i) => selectedSupplyIds.has(i.product.id));
  const supplyTotalAmount = selectedSupplyItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

  const selectedProduceItems = produceCart.filter((i) => selectedProduceIds.has(i.id));
  const produceTotalAmount = selectedProduceItems.reduce((sum, item) => sum + item.quantity * (item.listing.pricePerUnit || 0), 0);

  const uniqueSelectedSuppliers = Array.from(new Set(selectedSupplyItems.map((i) => i.product.supplierName || 'Supplier')));
  const hasMultipleSelectedSuppliers = uniqueSelectedSuppliers.length > 1;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'supplies') {
      if (selectedSupplyItems.length === 0) {
        toastWarning('No Items Selected', 'Please select at least 1 supply item to checkout.');
        return;
      }

      if (user?.role !== 'farmer' && user?.role !== 'buyer' && user?.role !== 'super_admin') {
        toastError('Restricted', 'Only registered Farmers or Buyers can place supply orders.');
        return;
      }

      if (hasMultipleSelectedSuppliers) {
        toastWarning(
          'Multiple Suppliers',
          `Your selected items come from multiple suppliers (${uniqueSelectedSuppliers.join(', ')}). Please select items from only 1 supplier per order.`
        );
        return;
      }

      const exceedingItems = selectedSupplyItems.filter((i) => i.quantity > i.product.stockQuantity);
      if (exceedingItems.length > 0) {
        toastWarning(
          'Stock Limit Exceeded',
          `"${exceedingItems[0].product.name}" only has ${exceedingItems[0].product.stockQuantity} in stock. Please adjust your cart quantity.`
        );
        return;
      }

      setOrdering(true);
      try {
        await supplyApi.createOrder({
          items: selectedSupplyItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
          paymentMethod,
        });

        // Remove only the checked-out items from cart (Shopee style)
        const remaining = cart.filter((i) => !selectedSupplyIds.has(i.product.id));
        saveSupplyCart(remaining);
        setSelectedSupplyIds(new Set(remaining.map((i) => i.product.id)));

        const successText = paymentMethod === 'cod'
          ? (deliveryMethod === 'pickup' ? 'Order placed! Pay upon in-store pickup. Redirecting to My Supply Orders…' : 'Order placed! Pay upon delivery. Redirecting to My Supply Orders…')
          : 'Order placed! Check My Supply Orders for payment instructions.';
        toastSuccess('Order Placed!', successText);
        setTimeout(() => navigate('/supply/orders'), 2200);
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to place supply order.';
        toastError('Checkout Failed', errorMsg);
        // Automatically reconcile cart if a product was not found or stock changed
        if (
          errorMsg.toLowerCase().includes('not found') ||
          errorMsg.toLowerCase().includes('no longer available') ||
          errorMsg.toLowerCase().includes('stock')
        ) {
          reconcileCartWithLiveStock();
        }
      } finally {
        setOrdering(false);
      }
    } else {
      // Produce Cart Checkout
      if (selectedProduceItems.length === 0) {
        toastWarning('No Crops Selected', 'Please select at least 1 crop to checkout.');
        return;
      }

      if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
        toastWarning('Address Required', 'Please enter your delivery address.');
        return;
      }

      if (!contactPhone.trim()) {
        toastWarning('Phone Required', 'Please provide your contact phone number.');
        return;
      }

      setOrdering(true);
      const successfulItemIds: string[] = [];
      const failedErrors: string[] = [];

      try {
        for (const item of selectedProduceItems) {
          try {
            const contactMsg = `Fulfillment: ${deliveryMethod === 'delivery' ? `Delivery to ${deliveryAddress.trim()}` : 'Farm-Gate Pickup'} • Phone: ${contactPhone.trim()} • Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery/Pickup' : 'GCash'}`;
            await produceApi.initiateTransaction({
              listingId: item.id,
              quantity: item.quantity,
              contactMessage: contactMsg,
              deliveryMethod: deliveryMethod,
              deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress.trim() : undefined,
            });
            successfulItemIds.push(item.id);
          } catch (itemErr: any) {
            const errMsg = itemErr.response?.data?.error || itemErr.message || `Failed to order ${item.listing?.cropName || 'crop'}`;
            failedErrors.push(errMsg);
          }
        }

        // Remove any successfully ordered items immediately so retries do not re-order them
        if (successfulItemIds.length > 0) {
          const remaining = produceCart.filter((i) => !successfulItemIds.includes(i.id));
          saveProduceCart(remaining);
          setSelectedProduceIds((prev) => {
            const next = new Set(prev);
            successfulItemIds.forEach((id) => next.delete(id));
            return next;
          });
        }

        // Auto-reconcile produce cart if there were errors or sold-out items
        if (failedErrors.length > 0) {
          await reconcileProduceCartWithLiveStock();
          toastError('Checkout Issue', failedErrors.join(' • '));
        }

        if (successfulItemIds.length > 0) {
          if (failedErrors.length === 0) {
            toastSuccess('Harvest Order Placed!', 'Harvest crop order placed successfully! Redirecting to My Crop Orders…');
            setTimeout(() => navigate('/produce/orders'), 2200);
          } else {
            toastSuccess('Partial Order Placed', `${successfulItemIds.length} harvest(s) ordered successfully. Unavailable items were removed from your cart.`);
          }
        }
      } finally {
        setOrdering(false);
      }
    }
  };

  // Visible payment options based on delivery method
  const visiblePaymentOptions = getPaymentOptions(deliveryMethod === 'pickup');

  // Card style helpers
  const panelBtn = (active: boolean): React.CSSProperties => ({
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${active ? '#15803d' : '#e2e8f0'}`,
    backgroundColor: active ? '#f0fdf4' : '#ffffff',
    color: active ? '#15803d' : '#475569',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  });

  const activeItemsCount = activeTab === 'supplies' ? cart.length : produceCart.length;
  const currentTotalAmount = activeTab === 'supplies' ? supplyTotalAmount : produceTotalAmount;
  const currentSelectedCount = activeTab === 'supplies' ? selectedSupplyItems.length : selectedProduceItems.length;

  const isPurchaser = user?.role === 'farmer' || user?.role === 'buyer' || user?.role === 'super_admin';

  if (user && !isPurchaser) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Navbar />
        <main style={{ maxWidth: '640px', margin: '60px auto', padding: '32px 24px', textAlign: 'center' }}>
          <div className="card" style={{ padding: '48px 32px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏪</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              Shopping Cart Unavailable
            </h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
              The shopping cart and purchasing features are reserved for Farmers and Buyers. As a Supplier, your account is configured to sell agricultural inputs and fulfill customer orders.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/supply/manage')} className="btn btn-primary" style={{ padding: '12px 20px', fontSize: '15px', fontWeight: 700 }}>
                🏷️ Manage My Products
              </button>
              <button onClick={() => navigate('/supply/orders')} className="btn btn-secondary" style={{ padding: '12px 20px', fontSize: '15px', fontWeight: 700 }}>
                📦 View Customer Orders
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />

      <main className="cart-main-container">
        {/* Page Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="cart-page-title">
            🛒 Shopping Cart & Express Checkout
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>
            Review your selected farm inputs or fresh crop harvests and proceed to checkout.
          </p>
        </div>

        {/* Unified Cart Tabs */}
        <div className="cart-channel-switcher segmented-tabs-bar" style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('supplies')}
            className={`segmented-tab-btn ${activeTab === 'supplies' ? 'active supply-active' : ''}`}
            style={{
              padding: '10px 22px',
              borderRadius: '24px',
              border: `2px solid ${activeTab === 'supplies' ? '#ca8a04' : '#e2e8f0'}`,
              backgroundColor: activeTab === 'supplies' ? '#fef9c3' : '#ffffff',
              color: activeTab === 'supplies' ? '#854d0e' : '#64748b',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏪 Agri-Supplies</span>
            <span style={{
              backgroundColor: activeTab === 'supplies' ? '#ca8a04' : '#e2e8f0',
              color: activeTab === 'supplies' ? '#ffffff' : '#64748b',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              {cart.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('produce')}
            className={`segmented-tab-btn ${activeTab === 'produce' ? 'active produce-active' : ''}`}
            style={{
              padding: '10px 22px',
              borderRadius: '24px',
              border: `2px solid ${activeTab === 'produce' ? '#176B3A' : '#e2e8f0'}`,
              backgroundColor: activeTab === 'produce' ? '#EAF6EE' : '#ffffff',
              color: activeTab === 'produce' ? '#0E4A27' : '#64748b',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🌱 Farm Produce</span>
            <span style={{
              backgroundColor: activeTab === 'produce' ? '#176B3A' : '#e2e8f0',
              color: activeTab === 'produce' ? '#ffffff' : '#64748b',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              {produceCart.length}
            </span>
          </button>
        </div>

        {activeItemsCount === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', borderRadius: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '54px' }}>{activeTab === 'supplies' ? '🏪' : '🌱'}</span>
            <h3 style={{ marginTop: '14px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Your {activeTab === 'supplies' ? 'Agri-Supply' : 'Farm Produce'} Cart is Empty
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
              {activeTab === 'supplies'
                ? 'Browse the Agri-Supply Store to add certified fertilizers, seeds, and tools.'
                : 'Browse the Crop Marketplace to add fresh harvests from local Northern Mindanao farmers.'}
            </p>
            <button
              onClick={() => navigate(activeTab === 'supplies' ? '/supply' : '/produce')}
              className="btn btn-primary btn-large"
              style={{ padding: '12px 28px', fontSize: '16px' }}
            >
              {activeTab === 'supplies' ? 'Browse Supply Store →' : 'Browse Crop Marketplace →'}
            </button>
          </div>
        ) : (
          <div className="cart-main-layout">

            {/* ── Cart Items Column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Shopee-style Select All Bar */}
              <div
                className="glass-panel"
                style={{
                  padding: '12px 18px',
                  borderRadius: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#ffffff',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#1A1C1A' }}>
                  <input
                    type="checkbox"
                    checked={
                      activeTab === 'supplies'
                        ? selectedSupplyIds.size === cart.length && cart.length > 0
                        : selectedProduceIds.size === produceCart.length && produceCart.length > 0
                    }
                    onChange={activeTab === 'supplies' ? toggleSelectAllSupplies : toggleSelectAllProduce}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Select All ({activeItemsCount} items)</span>
                </label>

                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {currentSelectedCount} selected
                </span>
              </div>

              {/* Items List */}
              {activeTab === 'supplies' ? (
                /* Supplies Items List */
                cart.map((item) => {
                  const isChecked = selectedSupplyIds.has(item.product.id);
                  return (
                    <div
                      key={item.product.id}
                      className="glass-panel cart-item-card"
                      style={{
                        background: isChecked ? '#ffffff' : '#f8fafc',
                        border: isChecked ? '1.5px solid #ca8a04' : '1.5px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="cart-item-checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectSupply(item.product.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                      />

                      {/* Product Image Thumbnail */}
                      <div className="cart-item-thumbnail">
                        <img
                          src={getImageUrl(item.product.images?.[0], categoryImages[item.product.category] ?? 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80')}
                          alt={item.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            if (e.currentTarget.parentElement) {
                              e.currentTarget.parentElement.innerText = '📦';
                              e.currentTarget.parentElement.style.fontSize = '26px';
                            }
                          }}
                        />
                      </div>

                      <div className="cart-item-info">
                        <div style={{ fontSize: '12px', color: '#854d0e', fontWeight: 700 }}>
                          {item.product.supplierName}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.product.name}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                          ₱{item.product.price.toLocaleString()} / {item.product.unit}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: item.product.stockQuantity <= 3 ? '#b45309' : '#15803d',
                            backgroundColor: item.product.stockQuantity <= 3 ? '#fef3c7' : '#dcfce7',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}>
                            {item.product.stockQuantity > 0 ? `Stock: ${item.product.stockQuantity}` : 'Out of Stock'}
                          </span>
                          {item.quantity >= item.product.stockQuantity && (
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706' }}>
                              (Max available in stock)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="cart-item-actions">
                        {/* Qty Stepper */}
                        <div className="cart-item-stepper" style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateSupplyQty(item.product.id, -1)}
                            disabled={item.quantity <= 1}
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              background: '#f8fafc',
                              cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '15px',
                              opacity: item.quantity <= 1 ? 0.4 : 1,
                            }}
                          >
                            −
                          </button>
                          <span style={{ padding: '6px 10px', fontWeight: 800, fontSize: '14px', minWidth: '28px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSupplyQty(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stockQuantity}
                            title={item.quantity >= item.product.stockQuantity ? `Only ${item.product.stockQuantity} available in stock` : 'Add 1'}
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              background: item.quantity >= item.product.stockQuantity ? '#f1f5f9' : '#f8fafc',
                              cursor: item.quantity >= item.product.stockQuantity ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '15px',
                              color: item.quantity >= item.product.stockQuantity ? '#94a3b8' : '#0f172a',
                              opacity: item.quantity >= item.product.stockQuantity ? 0.4 : 1,
                            }}
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal" style={{ fontSize: '16px', fontWeight: 800, color: '#ca8a04', minWidth: '80px', textAlign: 'right' }}>
                          ₱{(item.quantity * item.product.price).toLocaleString()}
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => handleRemoveSupply(item.product.id)}
                          title="Remove item"
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Produce Crops Items List */
                produceCart.map((item) => {
                  const isChecked = selectedProduceIds.has(item.id);
                  const maxHarvest = item.listing?.quantity ?? 9999;
                  return (
                    <div
                      key={item.id}
                      className="glass-panel cart-item-card"
                      style={{
                        background: isChecked ? '#ffffff' : '#f8fafc',
                        border: isChecked ? '1.5px solid #176B3A' : '1.5px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="cart-item-checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectProduce(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                      />

                      {/* Produce Crop Image Thumbnail */}
                      <div className="cart-item-thumbnail">
                        <img
                          src={getImageUrl(item.listing.photos?.[0] || item.listing.imageUrl, getCropImageFallback(item.listing.cropName))}
                          alt={item.listing.cropName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            if (e.currentTarget.parentElement) {
                              e.currentTarget.parentElement.innerText = '🌱';
                              e.currentTarget.parentElement.style.fontSize = '26px';
                            }
                          }}
                        />
                      </div>

                      <div className="cart-item-info">
                        <div style={{ fontSize: '12px', color: '#176B3A', fontWeight: 700 }}>
                          Farmer: {item.listing.sellerName || item.listing.farmerName || 'Verified Farmer'}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.listing.cropName}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                          ₱{item.listing.pricePerUnit} / {item.listing.unit || 'kg'} • 📍 {item.listing.location || 'Northern Mindanao'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#15803d',
                            backgroundColor: '#dcfce7',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}>
                            Available: {maxHarvest} {item.listing?.unit || 'kg'}
                          </span>
                          {item.quantity >= maxHarvest && (
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706' }}>
                              (Max harvest reached)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="cart-item-actions">
                        {/* Qty Stepper */}
                        <div className="cart-item-stepper" style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateProduceQty(item.id, -5)}
                            disabled={item.quantity <= 1}
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              background: '#f8fafc',
                              cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '15px',
                              opacity: item.quantity <= 1 ? 0.4 : 1,
                            }}
                          >
                            −
                          </button>
                          <span style={{ padding: '6px 10px', fontWeight: 800, fontSize: '14px', minWidth: '34px', textAlign: 'center' }}>
                            {item.quantity}kg
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateProduceQty(item.id, 5)}
                            disabled={item.quantity >= maxHarvest}
                            title={item.quantity >= maxHarvest ? `Only ${maxHarvest}kg available` : 'Add 5kg'}
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              background: item.quantity >= maxHarvest ? '#f1f5f9' : '#f8fafc',
                              cursor: item.quantity >= maxHarvest ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '15px',
                              color: item.quantity >= maxHarvest ? '#94a3b8' : '#0f172a',
                              opacity: item.quantity >= maxHarvest ? 0.4 : 1,
                            }}
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal" style={{ fontSize: '16px', fontWeight: 800, color: '#176B3A', minWidth: '80px', textAlign: 'right' }}>
                          ₱{(item.quantity * (item.listing.pricePerUnit || 0)).toLocaleString()}
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => handleRemoveProduce(item.id)}
                          title="Remove item"
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Order Summary Panel ── */}
            <div className="glass-panel cart-summary-panel">
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '18px' }}>
                {activeTab === 'supplies' ? 'Supply Checkout' : 'Crop Checkout'}
              </h2>

              <form onSubmit={handleCheckout}>
                {/* Fulfillment Method */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fulfillment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button type="button" onClick={() => setDeliveryMethod('delivery')} style={panelBtn(deliveryMethod === 'delivery')}>
                      🚚 Delivery
                    </button>
                    <button type="button" onClick={() => setDeliveryMethod('pickup')} style={panelBtn(deliveryMethod === 'pickup')}>
                      {activeTab === 'supplies' ? '🏪 Pickup' : '🚜 Farm Pickup'}
                    </button>
                  </div>
                  {deliveryMethod === 'delivery' ? (
                    <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🚚</span>
                      <span><strong>Delivery Fee:</strong> To be confirmed by the {activeTab === 'supplies' ? 'supplier' : 'farmer'} upon order acceptance based on vehicle/hauling arrangements.</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✓</span>
                      <span><strong>{activeTab === 'supplies' ? 'Store Pickup' : 'Farm-Gate Pickup'}:</strong> ₱0 (FREE)</span>
                    </div>
                  )}
                </div>

                {/* Delivery Address */}
                {deliveryMethod === 'delivery' && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Delivery Address *
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Barangay, Municipality, Province"
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'inherit', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* Contact Phone (for produce or delivery) */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Payment Method */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Method
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visiblePaymentOptions.map((opt) => {
                      const isActive = paymentMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => !opt.comingSoon && setPaymentMethod(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: isActive ? `2px solid ${activeTab === 'supplies' ? '#ca8a04' : '#176B3A'}` : '1.5px solid #e2e8f0',
                            backgroundColor: isActive ? (activeTab === 'supplies' ? '#fef9c3' : '#EAF6EE') : opt.comingSoon ? '#f8fafc' : '#fff',
                            cursor: opt.comingSoon ? 'default' : 'pointer',
                            textAlign: 'left',
                            opacity: opt.comingSoon ? 0.6 : 1,
                          }}
                        >
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '50%',
                            border: isActive ? `5px solid ${activeTab === 'supplies' ? '#ca8a04' : '#176B3A'}` : '2px solid #cbd5e1',
                            flexShrink: 0,
                          }} />
                          <span style={{ fontSize: '18px', lineHeight: 1 }}>{opt.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {opt.label}
                              {opt.comingSoon && (
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#64748b' }}>
                                  SOON
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multiple Suppliers Warning for Supplies */}
                {activeTab === 'supplies' && hasMultipleSelectedSuppliers && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#fff1f2',
                    border: '1.5px solid #fecdd3',
                    color: '#9f1239',
                    fontSize: '13px',
                    marginBottom: '16px',
                    lineHeight: 1.4,
                  }}>
                    ⚠️ <strong>Multiple Suppliers:</strong> Selected items come from {uniqueSelectedSuppliers.join(', ')}. Please select items from only 1 supplier to checkout.
                  </div>
                )}

                {/* Order Cost Breakdown */}
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Items Subtotal ({currentSelectedCount} item{currentSelectedCount !== 1 ? 's' : ''}):</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>₱{currentTotalAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Shipping / Delivery Fee:</span>
                    <span style={{ color: deliveryMethod === 'pickup' ? '#16a34a' : '#ca8a04', fontWeight: 700 }}>
                      {deliveryMethod === 'pickup' ? '₱0 (Pickup)' : 'Pending Seller Confirmation'}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>Total Order Value</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {deliveryMethod === 'delivery' ? '(Excl. delivery fee)' : '(Pickup at store/farm)'}
                      </div>
                    </div>
                    <span style={{ color: activeTab === 'supplies' ? '#ca8a04' : '#176B3A', fontSize: '22px', fontWeight: 800 }}>
                      ₱{currentTotalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ordering || currentSelectedCount === 0 || (activeTab === 'supplies' && hasMultipleSelectedSuppliers)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    backgroundColor: ordering || currentSelectedCount === 0 || (activeTab === 'supplies' && hasMultipleSelectedSuppliers)
                      ? '#a3a3a3'
                      : activeTab === 'supplies' ? '#ca8a04' : '#176B3A',
                    color: '#fff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: ordering || currentSelectedCount === 0 || (activeTab === 'supplies' && hasMultipleSelectedSuppliers) ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    transition: 'background 0.2s',
                  }}
                >
                  {ordering
                    ? 'Placing Order…'
                    : currentSelectedCount === 0
                      ? 'Select items to checkout'
                      : `Checkout Selected (${currentSelectedCount}) · ₱${currentTotalAmount.toLocaleString()}`
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
