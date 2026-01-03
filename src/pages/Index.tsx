// src/pages/Index.tsx
import { useEffect, useState } from "react";
import Login from "./Login";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { syncNow, validateLicense } from "@/lib/sync-adapter";
import { useStore } from "@/store/store";
import { addAccount } from "@/lib/accounts";
import { useToast } from "@/hooks/use-toast";
import { clearLicense, getDeviceId, getLicenseKey, setLicenseKey, setCustomDeviceName } from "@/lib/license";
// نوع المستخدم

type User = { username: string; role: "admin" | "employee" };
// الصفحة الرئيسية للنظام
const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const initialLicense = getLicenseKey();
  const [licenseKey, setLicenseKeyState] = useState(initialLicense);
  const [licenseValidated, setLicenseValidated] = useState(!!initialLicense);
  const [licenseError, setLicenseError] = useState("");
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [customDeviceName, setCustomDeviceNameState] = useState("");
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseType, setLicenseType] = useState("trial");
  const [deviceCount, setDeviceCount] = useState("1");
  const [usageType, setUsageType] = useState("single");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [notes, setNotes] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [newAccountUser, setNewAccountUser] = useState("");
  const [newAccountPass, setNewAccountPass] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"admin" | "employee">("employee");
  const [accountError, setAccountError] = useState("");
  const langLabel: Record<string, { text: string }> = {
    es: { text: "Español" },
    ar: { text: "العربية" },
    en: { text: "English" },
  };
  const currentLangKey = (i18n.language || "").slice(0, 2) as keyof typeof langLabel;
  const handleLangChange = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("lang", lng);
    } catch {
      /* ignore */
    }
  };

  const handleSendLicenseRequest = () => {
    if (!customerName.trim() || !storeName.trim() || !email.trim() || !licenseType || !deviceCount || !usageType || !paymentMethod) {
      toast({ title: t("buyRequiredError"), description: t("buyRequiredError"), variant: "destructive" });
      return;
    }

    toast({ title: t("buyLicenseTitle"), description: t("buySubmit"), variant: "success" });
    setBuyDialogOpen(false);
  };
  const userRole = currentUser?.role ?? null;

  // Persist login across refreshes
  useEffect(() => {
    getDeviceId();
  }, []);

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

  // Pull latest snapshot from Supabase right after login so the dashboard uses remote data.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const snap = await syncNow((snapshot) => {
        dispatch({ type: "APPLY_SNAPSHOT", payload: snapshot as any });
      });
      // إذا فشلت المزامنة (مثلاً الجهاز محذوف) اخرج واطلب المفتاح مجدداً
      if (!snap && !getLicenseKey()) {
        clearLicense();
        setCurrentUser(null);
      }
    })();
  }, [currentUser, dispatch]);

  const handleLogout = () => setCurrentUser(null);

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setLicenseError(t("licenseInvalid"));
      return;
    }
    setLicenseLoading(true);
    setLicenseError("");
    try {
      if (customDeviceName.trim()) setCustomDeviceName(customDeviceName.trim());
      const ok = await validateLicense(licenseKey.trim());
      if (ok) {
        setLicenseKey(licenseKey.trim());
        setLicenseKeyState(licenseKey.trim());
        setLicenseValidated(true);
      } else {
        setLicenseError(t("licenseInvalid"));
      }
    } catch {
      setLicenseError(t("licenseInvalid"));
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      let applied = false;
      const snap = await syncNow((snapshot) => {
        if (!snapshot) return;
        type AppState = typeof state;
        dispatch({ type: "APPLY_SNAPSHOT", payload: snapshot as Partial<AppState> });
        applied = true;
      });
      if (applied && snap) {
        toast({
          title: t("syncSuccess"),
          description: t("syncSuccessDesc"),
          variant: "success",
        });
      } else {
        if (!snap && !getLicenseKey()) {
          clearLicense();
          setCurrentUser(null);
        }
        toast({
          title: t("syncFailed"),
          description: t("syncFailedDesc"),
          variant: "destructive",
        });
      }
    } catch {
      if (!getLicenseKey()) {
        clearLicense();
        setCurrentUser(null);
      }
      toast({
        title: t("syncFailed"),
        description: t("syncFailedDesc"),
        variant: "destructive",
      });
    }
  };
  const openAccountDialog = () => {
    if (userRole !== "admin") return;
    setAccountError("");
    setNewAccountUser("");
    setNewAccountPass("");
    setNewAccountRole("employee");
    setAccountDialogOpen(true);
  };

  const handleCreateAccount = async () => {
    if (!newAccountUser.trim() || !newAccountPass.trim()) {
      setAccountError(t("accountCreateError"));
      return;
    }
    addAccount({
      username: newAccountUser.trim(),
      password: newAccountPass.trim(),
      role: newAccountRole,
      createdBy: currentUser?.username ?? "system",
    });
    await syncNow(() => {});
    toast({
      title: t("accountCreateSuccessTitle"),
      description: t("accountCreateSuccessDesc", { username: newAccountUser.trim() }),
      variant: "success",
    });
    setAccountDialogOpen(false);
  };

  // إذا لم يسجل الدخول بعد
  if (!currentUser) {
    if (!licenseValidated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
          <div className="w-[360px] sm:w-[420px] max-w-full mx-auto bg-white/90 shadow-2xl backdrop-blur-lg border border-white/40 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center gap-3">
              <Select value={currentLangKey} onValueChange={handleLangChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="whitespace-nowrap">
                    {t("buyLicense")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-w-[95vw]" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
                  <DialogHeader>
                    <DialogTitle>{t("buyLicenseTitle")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{t("buyBasicInfo")}</h4>
                      <Input placeholder={t("buyFullName")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      <Input placeholder={t("buyStoreName")} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                      <Input placeholder={t("buyPhoneOptional")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <Input placeholder={t("buyEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">{t("buyLicenseInfo")}</h4>
                      <Select value={licenseType} onValueChange={setLicenseType}>
                        <SelectTrigger><SelectValue placeholder={t("buyLicenseType")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">{t("buyLicenseTrial")}</SelectItem>
                          <SelectItem value="lifetime">{t("buyLicenseLifetime")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={deviceCount} onValueChange={setDeviceCount}>
                        <SelectTrigger><SelectValue placeholder={t("buyDeviceCount")} /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              {t("buyDevicesOption", { count })}
                            </SelectItem>
                          ))}
                          <SelectItem value="unlimited">{t("buyDevicesUnlimited")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={usageType} onValueChange={setUsageType}>
                        <SelectTrigger><SelectValue placeholder={t("buyUsageType")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">{t("buyUsageSingle")}</SelectItem>
                          <SelectItem value="multi">{t("buyUsageMulti")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">{t("buyPaymentInfo")}</h4>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue placeholder={t("buyPaymentMethod")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">{t("buyPaymentManual")}</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="usdt">USDT / Crypto</SelectItem>
                          <SelectItem value="cash">{t("buyPaymentCash")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <textarea
                        placeholder={t("buyNotesOptional")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
                      {t("cancel")}
                    </Button>
                    <Button onClick={handleSendLicenseRequest}>
                      {t("buySubmit")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
            <div className="text-center space-y-1">
              <div className="text-sm font-semibold text-blue-700">{t("syncNow")}</div>
              <div className="text-xl font-bold text-slate-900">{t("licenseKey") || "License Key"}</div>
              <p className="text-sm text-gray-600">{t("licenseKeyPlaceholder") || "XXXX-XXXX-XXXX"}</p>
            </div>
            <form className="space-y-3" onSubmit={handleLicenseSubmit}>
              <Input
                placeholder={t("licenseKeyPlaceholder") || "XXXX-XXXX-XXXX"}
                value={licenseKey}
                onChange={(e) => setLicenseKeyState(e.target.value)}
                disabled={licenseLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                required
              />
              {licenseError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {licenseError}
                </div>
              )}
              <div className="space-y-2">
                <Input
                  placeholder="Device name (optional)"
                  value={customDeviceName}
                  onChange={(e) => setCustomDeviceNameState(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                disabled={licenseLoading}
              >
                {licenseLoading ? t("view") : t("confirm")}
              </Button>
            </form>
          </div>
        </div>
      );
    }
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
                    {("ZentroPOS")}
                  </h1>
                  <p className="text-sm text-gray-600">{t("welcome")}</p>
                </div>
            </div>

            {/* أزرار التحكم */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 text-right sm:text-left">
              {userRole === "admin" && (
                <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={openAccountDialog}
                    >
                      {t("createAccount")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("accountCreateTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-700">{t("accountUsername")}</label>
                        <Input value={newAccountUser} onChange={(e) => setNewAccountUser(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-700">{t("accountPassword")}</label>
                        <Input
                          type="password"
                          value={newAccountPass}
                          onChange={(e) => setNewAccountPass(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-700">{t("accountRole")}</label>
                        <Select
                          value={newAccountRole}
                          onValueChange={(val: "admin" | "employee") => setNewAccountRole(val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t("accountRoleAdmin")}</SelectItem>
                            <SelectItem value="employee">{t("accountRoleEmployee")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {accountError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                          {accountError}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateAccount} className="bg-blue-600 text-white">
                        {t("accountCreateConfirm")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {/* اختيار اللغة */}
                            <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
                <SelectTrigger className="w-full sm:w-40">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-blue-700">
                      {langLabel[currentLangKey]?.text ?? ""}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="es">
                    <div className="flex items-center gap-2">
                      <span>{langLabel.es.text}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ar">
                    <div className="flex items-center gap-2">
                      <span>{langLabel.ar.text}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span>{langLabel.en.text}</span>
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
              onClick={handleSync}
            >
              {t("syncNow")} 🔄
            </Button>
          </div>
          <div className="relative">
            {/* Desktop / tablet tabs */}
            <TabsList
              className="hidden md:grid w-full bg-white/60 backdrop-blur-sm border border-blue-100 h-16 gap-2 px-0 items-stretch"
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
                  className="flex-col gap-1 flex-shrink-0 min-w-[130px] sm:min-w-[140px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white md:snap-start"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs">{t("reports")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="invoices"
                  className="flex-col gap-1 flex-shrink-0 min-w-[140px] sm:min-w-[150px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white md:snap-start"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">{t("purchaseInvoices")}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="products"
                  className="flex-col gap-1 flex-shrink-0 min-w-[130px] sm:min-w-[140px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white md:snap-start"
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs">{t("products")}</span>
                </TabsTrigger>
              </>
            )}

            {/* تبويبات مشتركة بين المدير والعامل */}
            <TabsTrigger
              value="sales-invoices"
              className="flex-col gap-1 flex-shrink-0 min-w-[140px] sm:min-w-[160px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white md:snap-start"
            >
              <Receipt className="w-5 h-5" />
              <span className="text-xs">{t("salesInvoices")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="sales"
              className="flex-col gap-1 flex-shrink-0 min-w-[130px] sm:min-w-[140px] md:min-w-0 md:h-full md:justify-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white md:snap-start"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">{t("addInvoice")}</span>
            </TabsTrigger>
            </TabsList>
          </div>
          {/* Mobile grid nav to keep tabs visible without horizontal scroll */}
          <div className="md:hidden mt-3">
            <TabsList
              className={`grid w-full bg-white/60 backdrop-blur-sm border border-blue-100 h-auto gap-2 px-2 items-stretch ${
                userRole === "admin" ? "grid-cols-2" : "grid-cols-2"
              }`}
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
            >
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
          </div>

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
