// src/components/ProductManagement.tsx
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, Trash2, Barcode, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/store/store";
import { useTranslation } from "react-i18next";

interface ProductFormData {
  name: string;
  price: string;
  stock: string;
  barcode: string;
  categoryId: string;
  image: string;
}
//  و

const ProductManagement = () => {
  const { state, dispatch } = useStore();
  const { products, categories, config } = state;
  const { toast } = useToast();
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: "",
    stock: "",
    barcode: "",
    categoryId: "",
    image: "",
  });
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 1000000000).toString();
    setFormData({ ...formData, barcode });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData({ ...formData, image: reader.result || "" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast({
        title: t("productFormErrorTitle"),
        description: t("productFormErrorDesc"),
        variant: "destructive",
      });
      return;
    }

    const newProduct = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      barcode: formData.barcode,
      categoryId: formData.categoryId,
      image: formData.image || null,
    };

    if (editingProduct) {
      dispatch({ type: "UPDATE_PRODUCT", payload: newProduct });
      toast({ title: t("productUpdatedTitle"), description: t("productUpdatedDesc", { name: newProduct.name }) });
    } else {
      dispatch({ type: "ADD_PRODUCT", payload: newProduct });
      toast({ title: t("productAddedTitle"), description: t("productAddedDesc", { name: newProduct.name }) });
    }

    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", price: "", stock: "", barcode: "", categoryId: "", image: "" });
    setShowUrlInput(false);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      barcode: product.barcode || "",
      categoryId: product.categoryId || "",
      image: product.image || "",
    });
    setShowUrlInput(!!product.image && typeof product.image === "string" && product.image.startsWith("http"));
    setIsDialogOpen(true);
  };

 const handleDelete = (id: string) => {
  if (!confirm(t("productDeleteConfirm"))) return;

  dispatch({ type: "DELETE_PRODUCT", payload: id });
  toast({ title: t("productDeletedTitle"), description: t("productDeletedDesc") });
};


 const filteredProducts = products
  .filter((p) => !p.deleted) // ✅ استبعاد المنتجات المحذوفة من العرض
  .filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (categories.find(c => c.id === product.categoryId)?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );


  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || "#6B7280";
  };

  // وظيفة تغيير السعر السريعة (للـ admin) — تستدعي الـ action المخصص
  const changePrice = (productId: string) => {
    const input = prompt(t("changePricePrompt"));
    if (!input) return;
    const price = parseFloat(input);
    if (isNaN(price)) {
      alert(t("changePriceInvalid"));
      return;
    }
    dispatch({ type: "UPDATE_PRODUCT_PRICE", payload: { productId, price } });
    toast({ title: t("changePriceToastTitle"), description: t("changePriceToastDesc", { price }) });
  };
const CategoryForm: React.FC<{ dispatch: any }> = ({ dispatch }) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleAdd = () => {
    if (!name.trim()) {
      toast({ title: t("categoryErrorTitle"), description: t("categoryNameRequired"), variant: "destructive" });
      return;
    }

    const newCategory = {
      id: Date.now().toString(),
      name,
      color,
    };

    dispatch({ type: "ADD_CATEGORY", payload: newCategory });

    toast({
      title: t("categoryAddedTitle"),
      description: t("categoryAddedDesc", { name }),
    });

    setName("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("categoryNameLabel")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("categoryNameLabel")} />
      </div>
      <div>
        <Label>{t("categoryColorLabel")}</Label>
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 p-0" />
      </div>
      <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        💾 {t("saveCategory")}
      </Button>
    </div>
  );
};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-blue-800">{t("productManagementTitle")}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              onClick={() => {
                setEditingProduct(null);
                setFormData({ name: "", price: "", stock: "", barcode: "", categoryId: "", image: "" });
              }}
              asChild={false}
              // منع التفاف النص ليأخذ الزر عرضاً كافياً
              style={{ whiteSpace: "nowrap" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addNewProduct")}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg max-w-[95vw]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t("editProduct") : t("addNewProduct")}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("productName")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("productName")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">{t("unitPrice")} *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="stock">{t("stock")}</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="barcode">{t("barcode")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder={t("barcode")}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={generateBarcode}>
                    <Barcode className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="image">{t("productImage")}</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      className="h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("chooseFile")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUrlInput((v) => !v)}
                      className="whitespace-nowrap"
                    >
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, image: "" });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={!formData.image}
                      className="whitespace-nowrap"
                    >
                      {t("delete")}
                    </Button>
                    {formData.image && (
                      <img src={formData.image} alt="preview" className="w-12 h-12 rounded object-contain border bg-white" />
                    )}
                  </div>
                  {showUrlInput && (
                    <div className="flex items-center gap-3">
                      <Input
                        type="url"
                        placeholder={t("imageUrlPlaceholder")}
                        value={formData.image?.startsWith("http") ? formData.image : ""}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
  <Label htmlFor="category">{t("category")}</Label>
  <div className="flex gap-2 items-center">
    <Select
      value={formData.categoryId}
      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
    >
      <SelectTrigger className="flex-1">
        <SelectValue placeholder={t("selectCategoryPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* زر إضافة فئة جديدة */}
    <Dialog modal={false}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t("newCategory")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t("addCategoryTitleFull")}</DialogTitle>
        </DialogHeader>

        <CategoryForm dispatch={dispatch} />
      </DialogContent>
    </Dialog>

{/* إدارة الفئات */}
    <Dialog modal={false}>
  <DialogTrigger asChild>
    <Button type="button" variant="outline" size="sm" className="mt-2">
      ⚙️ {t("manageCategories")}
    </Button>
  </DialogTrigger>

  <DialogContent className="sm:max-w-md" dir="rtl">
    <DialogHeader>
      <DialogTitle>{t("manageCategoriesTitle")}</DialogTitle>
    </DialogHeader>

    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {categories.length === 0 ? (
        <p className="text-gray-500 text-center py-4">{t("noCategories")}</p>
      ) : (
        categories.map((cat) => {
          const usedBy = products.filter((p) => p.categoryId === cat.id && !p.deleted).length;

          return (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
              </div>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (usedBy > 0) {
                    toast({
                      title: t("categoryDeleteInUseTitle"),
                      description: t("categoryDeleteInUseDesc", { count: usedBy }),
                      variant: "destructive",
                    });
                    return;
                  }
                  if (confirm(t("categoryDeleteConfirm", { name: cat.name }))) {
                    dispatch({ type: "DELETE_CATEGORY", payload: cat.id });
                    toast({
                      title: t("categoryDeletedTitle"),
                      description: t("categoryDeletedDesc", { name: cat.name }),
                    });
                  }
                }}
              >
                🗑️ {t("delete")}
              </Button>
            </div>
          );
        })
      )}
    </div>
  </DialogContent>
</Dialog>

  </div>
</div>


              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">
                  {editingProduct ? t("edit") : t("add")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* إدارة الفئات */}
      {/* CategoryManagement يبقى كما هو ويستعمل onCategoriesUpdate لتحديث state.categories */}
      {/* هنا نعرض شريط البحث */}
      <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة المنتجات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-gray-800">{product.name}</CardTitle>
                <Badge
                  variant="secondary"
                  className="text-xs text-white border-0"
                  style={{ backgroundColor: getCategoryColor(product.categoryId) }}
                >
                  {categories.find(c => c.id === product.categoryId)?.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-32 rounded-md border bg-white object-contain"
                />
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("unitPrice")}:</span>
                <span className="font-bold text-blue-600">
                  {product.price} {config.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t("stock")}:</span>
                <Badge
                  variant={product.stock < 20 ? "destructive" : "secondary"}
                  className={product.stock < 20 ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"}
                >
                  {product.stock}
                </Badge>
              </div>
              {product.barcode && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("barcode")}:</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{product.barcode}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(product)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" />
                  {t("edit")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => changePrice(product.id)}>
                  {t("changePriceToastTitle")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t("noProductsAvailable")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductManagement;
