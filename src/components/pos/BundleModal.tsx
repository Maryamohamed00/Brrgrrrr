import { useState } from "react";

// Add optional (?) to categoryId so it doesn't crash if missing
type Product = {
  id: string;
  name: string;
  price: number;
  isBundle: boolean;
  categoryId?: string; // Add this
  bundleMaxItems?: number;
  bundleAllowedCats?: string[];
};

type SubItemSelection = {
  productId: string;
  productName: string;
  quantity: number;
  note: string;
};

export default function BundleModal({
  isOpen,
  bundleProduct,
  availableProducts,
  onClose,
  onAddToCart,
}: {
  isOpen: boolean;
  bundleProduct: Product | null;
  availableProducts: Product[];
  onClose: () => void;
  onAddToCart: (bundle: Product, subItems: SubItemSelection[]) => void;
}) {
  const [subItems, setSubItems] = useState<SubItemSelection[]>([]);

  if (!isOpen || !bundleProduct) return null;

  // Filter out bundles so cashiers can't accidentally put a bundle inside a bundle!
  const validSubProducts = availableProducts // Inside your validSubProducts filter:
    .filter((p) => {
      // 1. Must not be a bundle
      if (p.isBundle) return false;

      // 2. If there are no restrictions, show all
      if (!bundleProduct?.bundleAllowedCats?.length) return true;

      // 3. If categoryId exists, check if it's allowed
      // Using (p.categoryId || "") ensures we pass a string to .includes()
      return bundleProduct.bundleAllowedCats.includes(p.categoryId || "");
    });
  // Change categoryId to categoryId? (optional)
  const addSubItem = (
    productId: string,
    productName: string,
    categoryId?: string,
  ) => {
    // 1. Enforce the limit (blocking)
    const maxItems = bundleProduct?.bundleMaxItems || 0;
    if (maxItems > 0 && subItems.length >= maxItems) {
      alert(
        `You have reached the maximum limit of ${maxItems} items for this bundle.`,
      );
      return;
    }

    // 2. Create a safe version of the ID to use in your logic
    const safeCategoryId = categoryId || "unknown";

    // 3. Validation logic
    if (
      bundleProduct?.bundleAllowedCats?.length &&
      !bundleProduct.bundleAllowedCats.includes(safeCategoryId)
    ) {
      alert("This item is not allowed in this bundle.");
      return;
    }

    // 4. Proceed with adding the item
    setSubItems([
      ...subItems,
      { productId, productName, quantity: 1, note: "" },
    ]);
  };

  const updateNote = (index: number, note: string) => {
    const newItems = [...subItems];
    newItems[index].note = note;
    setSubItems(newItems);
  };

  const removeSubItem = (index: number) => {
    setSubItems(subItems.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (subItems.length === 0) {
      alert("Please add at least one sandwich/item to this bundle.");
      return;
    }
    onAddToCart(bundleProduct, subItems);
    setSubItems([]); // Reset for the next order
    onClose();
  };

  const handleCancel = () => {
    setSubItems([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-ink">
              Customize {bundleProduct.name}
            </h2>
            <p className="text-sm text-muted mt-1">
              Tap items below to add them to this bundle.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-fire-dark text-3xl leading-none font-light"
          >
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Selected Items List */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Items inside this bundle
            </h3>
            {subItems.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 italic bg-gray-50 text-sm">
                No items selected yet. Tap the products below to build the
                combo!
              </div>
            ) : (
              <div className="space-y-3">
                {subItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-ink">
                        {item.productName}
                      </span>
                      <button
                        onClick={() => removeSubItem(idx)}
                        className="text-fire-dark text-xs font-bold bg-fire/10 hover:bg-fire/20 px-3 py-1.5 rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Kitchen note (e.g. no mayo, extra spicy)"
                      value={item.note}
                      onChange={(e) => updateNote(idx, e.target.value)}
                      className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Menu Grid */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Menu
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {validSubProducts.map((p) => (
                <button
                  key={p.id}
                  // Passing p.categoryId directly is now fine because the function accepts optional
                  onClick={() => addSubItem(p.id, p.name, p.categoryId)}
                  className="text-left p-3 border border-gray-200 rounded-xl hover:border-ink hover:bg-gray-50 transition active:scale-95"
                >
                  <div className="font-bold text-sm text-ink truncate">
                    {p.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 text-ink font-bold py-3.5 rounded-xl hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] bg-ink text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition shadow-lg"
          >
            Add Bundle to Cart ({subItems.length} items)
          </button>
        </div>
      </div>
    </div>
  );
}
