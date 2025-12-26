// src/pages/Index.tsx
import { useEffect, useState } from "react";
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
import { addAccount } from "@/lib/accounts";
// نوع المستخدم

type User = { username: string; role: "admin" | "employee" };
// الصفحة الرئيسية للنظام
const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useStore();
  const langLabel: Record<string, { flag: string; text: string }> = {
    es: { flag: "🇪🇸", text: "Español" },
    ar: { flag: "🇸🇦", text: "العربية" },
    en: { flag: "🇺🇸", text: "English" },
  };
  const currentLangKey = (i18n.language || "").slice(0, 2) as keyof typeof langLabel;
  const userRole = currentUser?.role ?? null;

  // Persist login across refreshes
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_current_user");
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("pos_current_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("pos_current_user");
      }
    } catch {
      /* ignore */
    }
  }, [currentUser]);

  const handleLogout = () => setCurrentUser(null);
  const handleAddAccount = () => {
    if (userRole !== "admin") return;
    const username = prompt("اسم المستخدم الجديد");
    if (!username) return;
    const password = prompt("كلمة المرور");
    if (!password) return;
    const roleInput = prompt('الدور (admin أو employee)', "employee") || "employee";
    const role = roleInput === "admin" ? "admin" : "employee";
    addAccount({ username, password, role, createdBy: currentUser?.username ?? "system" });
    syncNow(() => {});
    alert("تم إنشاء الحساب");
  };

  // إذا لم يسجل الدخول بعد
  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
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
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 text-right sm:text-left">
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleAddAccount}
                >
                  إنشاء حساب
                </Button>
              )}
              {/* اختيار اللغة */}
              <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                <SelectTrigger className="w-full sm:w-40">
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
                  if (!snapshot) return;
                  type AppState = typeof state;
                  dispatch({ type: "APPLY_SNAPSHOT", payload: snapshot as Partial<AppState> });
                });
              }}
            >
              {t("syncNow")} 🔄
            </Button>
          </div>
          <TabsList
            className="flex md:grid w-full bg-white/60 backdrop-blur-sm border border-blue-100 h-16 overflow-x-auto md:overflow-visible gap-2 px-2 md:px-0 scroll-smooth flex-nowrap md:flex-none items-stretch"
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
                  className="flex-col gap-1 min-w-[150px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs">{t("reports")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="invoices"
                  className="flex-col gap-1 min-w-[160px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">{t("purchaseInvoices")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="products"
                  className="flex-col gap-1 min-w-[150px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs">{t("products")}</span>
                </TabsTrigger>
              </>
            )}

            {/* تبويبات مشتركة بين المدير والعامل */}
            <TabsTrigger
              value="sales-invoices"
              className="flex-col gap-1 min-w-[170px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Receipt className="w-5 h-5" />
              <span className="text-xs">{t("salesInvoices")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="sales"
              className="flex-col gap-1 min-w-[150px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">{t("addInvoice")}</span>
            </TabsTrigger>
          </TabsList>

          {/* المحتوى */}
          <TabsContent value="sales">
            <SalesInterface currentUser={currentUser} />
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
                <PurchaseInvoices currentUser={currentUser} />
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
