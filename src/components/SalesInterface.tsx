import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Barcode, Plus, Minus, Trash2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/store/store";

interface CartItemLocal {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  categoryId?: string;
}

const SalesInterface = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useStore();
  const { products, categories, config } = state;
  const { toast } = useToast();

  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItemLocal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(t("allCategories"));

  const categoriesList = [
    t("allCategories"),
    ...Array.from(
      new Set(
        products
          .filter((p) => !p.deleted)
          .map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return cat ? cat.name : null;
          })
          .filter((name): name is string => !!name)
      )
    ),
  ];

  const addToCart = (product: any) => {
    if (!product || product.stock <= 0) {
      toast({
        title: t("notFoundTitle"),
        description: t("notFoundDesc"),
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    const nextQty = (existingItem?.quantity ?? 0) + 1;
    if (nextQty > product.stock) {
      toast({
        title: t("notFoundTitle"),
        description: t("notFoundDesc"),
        variant: "destructive",
      });
      return;
    }
    
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          barcode: product.barcode,
          categoryId: product.categoryId,
        },
      ]);
    }

    toast({
      title: t("addedTitle"),
      description: t("addedDescription", { name: product.name }),
    });
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const product = products.find((p) => p.id === id);
    if (product && newQuantity > product.stock) {
      toast({
        title: t("notFoundTitle"),
        description: t("notFoundDesc"),
        variant: "destructive",
      });
      return;
    }

    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.id !== id));
    } else {
      setCart(
        cart.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setBarcode("");
    } else {
      toast({
        title: t("notFoundTitle"),
        description: t("notFoundDesc"),
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: t("emptyCartTitle"),
        description: t("emptyCartDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: t("noPaymentTitle"),
        description: t("noPaymentDesc"),
        variant: "destructive",
      });
      return;
    }

    // Prevent checkout if any item exceeds available stock
    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (!product || product.stock < item.quantity) {
        toast({
          title: t("notFoundTitle"),
          description: t("notFoundDesc"),
          variant: "destructive",
        });
        return;
      }
    }

    const itemsForSell = cart.map((it) => ({
      productId: it.id,
      quantity: it.quantity,
    }));

    dispatch({
      type: "SELL_ITEMS",
      payload: {
        items: itemsForSell,
        cashier: t("mainCashier"),
        paymentMethod:
          paymentMethod === t("cash")
            ? "cash"
            : paymentMethod === t("card")
            ? "card"
            : "transfer",
	 exchangeRate: config.exchangeRate, // ✅ تخزين سعر الصرف وقت إنشاء الفاتورة
      },
    });

    toast({
      title: t("successTitle"),
      description: t("successDesc", {
        total: calculateTotal().toFixed(2),
        currency: config.currency,
        method: paymentMethod,
      }),
    });

    setCart([]);
    setPaymentMethod("");
  };

  const filteredProducts = products
    .filter((p) => !p.deleted)
    .filter(
      (product) =>
        (selectedCategory === t("allCategories") ||
          categories.find((c) => c.id === product.categoryId)?.name === selectedCategory) &&
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المنتجات */}
        <div className="lg:col-span-2 space-y-6">
          {/* الباركود */}
          <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Barcode className="w-5 h-5" />
                {t("barcodeScanner")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder={t("barcodePlaceholder")}
                  className="flex-1 text-center font-mono text-lg"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  {t("add")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* قائمة المنتجات */}
          <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Search className="w-5 h-5" />
                {t("availableProducts")}
              </CardTitle>

              <div className="flex flex-wrap gap-2">
                {categoriesList.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className={
                      selectedCategory === cat
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : ""
                    }
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-blue-100 hover:border-blue-300"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {product.name}
                      </h3>
                      <p className="text-lg font-bold text-blue-600 mb-2">
                        {product.price} {config.currency}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {t("available")}: {product.stock}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* السلة */}
        <div className="space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Receipt className="w-5 h-5" />
                {t("cart")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {t("emptyCart")}
                </p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {item.name}
                          </h4>
                          <p className="text-sm text-blue-600">
                            {item.price} {config.currency}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {t("paymentMethod")}:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={
                          paymentMethod === t("cash")
                            ? "default"
                            : "outline"
                        }
                        className={
                          paymentMethod === t("cash")
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : ""
                        }
                        onClick={() => setPaymentMethod(t("cash"))}
                      >
                        💵 {t("cash")}
                      </Button>
                      <Button
                        variant={
                          paymentMethod === t("card")
                            ? "default"
                            : "outline"
                        }
                        className={
                          paymentMethod === t("card")
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : ""
                        }
                        onClick={() => setPaymentMethod(t("card"))}
                      >
                        💳 {t("card")}
                      </Button>
                      <Button
                        variant={
                          paymentMethod === t("transfer")
                            ? "default"
                            : "outline"
                        }
                        className={
                          paymentMethod === t("transfer")
                            ? "bg-purple-500 hover:bg-purple-600 text-white"
                            : ""
                        }
                        onClick={() => setPaymentMethod(t("transfer"))}
                      >
                        🏦 {t("transfer")}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>{t("total")}:</span>
                      <span className="text-blue-600">
                        {calculateTotal().toFixed(2)} {config.currency}
                      </span>
                    </div>
			{/* 💱 عرض المبلغ بما يعادل البوليفار وسعر الصرف */}
{config.currency === "$" && config.exchangeRate && (
  <div className="text-right text-sm text-gray-600">
    <p>
      💱 {t("equivalentTo")}{" "}
      <span className="font-semibold text-blue-600">
        {(calculateTotal() * config.exchangeRate).toFixed(2)} Bs
      </span>
    </p>
    <p className="text-xs text-gray-500">
      {t("exchangeRateInfo", { rate: config.exchangeRate })}
    </p>
  </div>
)}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="destructive"
                        className="border-red-400 hover:bg-red-50 flex items-center justify-center"
                        onClick={() => setCart([])}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("clearAll")}
                      </Button>

                      <Button
                        onClick={handleCheckout}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {t("checkout")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SalesInterface;
