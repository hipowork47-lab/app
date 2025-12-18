// src/pages/Index.tsx
import { useState } from "react";
import Login from "./Login";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Calculator,
  Receipt,
} from "lucide-react";
import SalesInterface from "@/components/SalesInterface";
import ProductManagement from "@/components/ProductManagement";
import PurchaseInvoices from "@/components/PurchaseInvoices";
import ReportsSection from "@/components/ReportsSection";
import SalesInvoices from "@/components/SalesInvoices";
import { useTranslation } from "react-i18next";
import { syncNow } from "@/lib/sync-adapter";
import { useStore } from "@/store/store";

const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [userRole, setUserRole] = useState(null); // "admin" أو "employee"
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useStore();
  const langLabel: Record<string, { flag: string; text: string }> = {
    es: { flag: "🇪🇸", text: "Español" },
    ar: { flag: "🇸🇦", text: "العربية" },
    en: { flag: "🇺🇸", text: "English" },
  };
  const currentLangKey = (i18n.language || "").slice(0, 2) as keyof typeof langLabel;

  const handleLogout = () => setUserRole(null);

  // إذا لم يسجل الدخول بعد
  if (!userRole) {
    return <Login onLogin={setUserRole} />;
  }

  // الصفحة الرئيسية
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* شعار واسم النظام */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t("welcome")}
                </h1>
                <p className="text-sm text-gray-600">{t("reports")}</p>
              </div>
            </div>

            {/* أزرار التحكم */}
            <div className="flex items-center gap-3">
              {/* اختيار اللغة */}
              <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                <SelectTrigger className="w-40">
                  <div className="flex items-center gap-2">
                    <span>{langLabel[currentLangKey]?.flag ?? "🌐"}</span>
                    <span className="truncate">{langLabel[currentLangKey]?.text ?? ""}</span>
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="es">
                    <div className="flex items-center gap-2">
                      <span>🇪🇸</span>
                      <span>Español</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ar">
                    <div className="flex items-center gap-2">
                      <span>🇸🇦</span>
                      <span>العربية</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span>🇺🇸</span>
                      <span>English</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* زر تسجيل الخروج */}
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-800 border-red-200 cursor-pointer"
                onClick={handleLogout}
              >
                {t("logout")}
              </Badge>

              {/* نوع المستخدم */}
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {userRole === "admin" ? t("login.adminAccount") : t("login.workerAccount")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
        >
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                syncNow((snapshot) => {
                  if (snapshot) {
                    dispatch({
                      type: "LOAD_STATE",
                      payload: {
                        ...state,
                        ...snapshot,
                        config: { ...state.config, ...snapshot.config },
                      },
                    });
                  }
                });
              }}
            >
              {t("syncNow")} 🔄
            </Button>
          </div>
          <TabsList
            className="grid w-full bg-white/60 backdrop-blur-sm border border-blue-100 h-16"
            style={{
              gridTemplateColumns:
                userRole === "admin" ? "repeat(5, 1fr)" : "repeat(2, 1fr)",
            }}
            dir={i18n.language === "ar" ? "rtl" : "ltr"}
          >
            {/* التبويبات حسب نوع المستخدم */}
            {userRole === "admin" && (
              <>
                <TabsTrigger
                  value="reports"
                  className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs">{t("reports")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="invoices"
                  className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">{t("purchaseInvoices")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="products"
                  className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs">{t("products")}</span>
                </TabsTrigger>
              </>
            )}

            {/* تبويبات مشتركة بين المدير والعامل */}
            <TabsTrigger
              value="sales-invoices"
              className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Receipt className="w-5 h-5" />
              <span className="text-xs">{t("salesInvoices")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="sales"
              className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">{t("addInvoice")}</span>
            </TabsTrigger>
          </TabsList>

          {/* المحتوى */}
          <TabsContent value="sales">
            <SalesInterface />
          </TabsContent>
          <TabsContent value="sales-invoices">
            <SalesInvoices />
          </TabsContent>

          {userRole === "admin" && (
            <>
              <TabsContent value="products">
                <ProductManagement />
              </TabsContent>
              <TabsContent value="invoices">
                <PurchaseInvoices />
              </TabsContent>
              <TabsContent value="reports">
                <ReportsSection />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
