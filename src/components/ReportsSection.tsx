// src/components/ReportsSection.tsx
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, Calendar, TrendingUp, ShoppingCart, DollarSign } from "lucide-react";
import { useStore } from "@/store/store";
import { useTranslation } from "react-i18next";
import { fetchLicenseInfo, removeLinkedDevice } from "@/lib/sync-adapter";

const ReportsSection: React.FC = () => {

  const { state, dispatch } = useStore();
  const { t } = useTranslation();
  const [newRate, setNewRate] = useState(state.config?.exchangeRate || 45); // السعر الابتدائي بالبوليفار
  const [pendingPrimaryCurrency, setPendingPrimaryCurrency] = useState(state.config?.currency || "$");
  const [pendingSecondaryCurrency, setPendingSecondaryCurrency] = useState(state.secondaryCurrency || "Bs");
  const [showCurrencyPanel, setShowCurrencyPanel] = useState(false);
  const [showRateInput, setShowRateInput] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [devicesList, setDevicesList] = useState<{ id: string; name?: string; type?: string }[]>([]);
  const [devicesLimit, setDevicesLimit] = useState<number | null>(null);
  const [removingDeviceId, setRemovingDeviceId] = useState<string>("");
  const currencyOptions = ["$", "\u20AC", "\u00A3", "\u00A5", "\u20B9", "\u20BA", "\u062F.\u0625", "\u20BD", "R$", "\u20A9", "\u20AA", "\u20AB"];
   // مزامنة قيمة سعر الصرف في الواجهة مع القيمة في الـ store
React.useEffect(() => {
  setNewRate(state.config.exchangeRate);
  setPendingPrimaryCurrency(state.config.currency || "$");
  setPendingSecondaryCurrency(state.secondaryCurrency || "Bs");
}, [state.config.exchangeRate, state.config.currency]);

  const handleExchangeRateChange = () => {
    if (newRate > 0) {
      dispatch({ type: "SET_EXCHANGE_RATE", payload: newRate });
      setShowRateInput(false);
      alert(t("exchangeRateUpdated", { rate: newRate }));
    } else {
      alert(t("exchangeRateInvalid"));
    }
  };


  
  const [selectedReport, setSelectedReport] = useState<string>("sales");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const loadDevices = async () => {
    setDevicesLoading(true);
    setDevicesError("");
    try {
      const info = await fetchLicenseInfo();
      if (!info) {
        setDevicesError(t("licenseKey") || "License key required");
        setDevicesList([]);
        setDevicesLimit(null);
      } else {
        setDevicesList(
          (info.devices ?? []).map((d: any) => ({
            id: d.id ?? d.deviceId ?? d,
            name: d.name ?? d.id ?? d,
            type: d.type ?? d.deviceType ?? "",
          }))
        );
        setDevicesLimit(info.maxDevices ?? null);
      }
    } catch (e) {
      setDevicesError(t("errorTitle") || "Error");
    } finally {
      setDevicesLoading(false);
    }
  };

  // اضمن مصفوفات افتراضية
  const sales = state.sales ?? [];
  const purchases = state.purchases ?? [];

  const toDate = (d: string | undefined | null) => (d ? new Date(d) : null);

  // ✅ تجميع مبيعات يومية (عدد الفواتير وإجمالي المبيعات)
const salesReportData = useMemo(() => {
  const map: Record<string, { invoices: number; total: number }> = {};

  sales.forEach((s) => {
    if (!s.date) return;
    if (!map[s.date]) {
      map[s.date] = { invoices: 0, total: 0 };
    }
    map[s.date].invoices += 1;
    map[s.date].total += s.total;
  });

  return Object.entries(map)
    .map(([date, vals]) => ({
      date,
      invoices: vals.invoices,
      total: vals.total,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // latest first
}, [sales]);


 // ✅ تجميع مشتريات يومية (عدد الفواتير وإجمالي المشتريات)
const purchaseReportData = useMemo(() => {
  const map: Record<string, { invoices: number; total: number }> = {};

  purchases.forEach((p) => {
    if (!p.date) return;
    if (!map[p.date]) {
      map[p.date] = { invoices: 0, total: 0 };
    }
    map[p.date].invoices += 1;
    map[p.date].total += p.total;
  });

  return Object.entries(map)
    .map(([date, vals]) => ({
      date,
      invoices: vals.invoices,
      total: vals.total,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // latest first
}, [purchases]);

  // تجميع أرباح حسب التاريخ
  const profitReportData = useMemo(() => {
    const map: Record<string, { sales: number; purchases: number }> = {};
    sales.forEach((s) => {
      map[s.date] = map[s.date] || { sales: 0, purchases: 0 };
      map[s.date].sales += s.total;
    });
    purchases.forEach((p) => {
      map[p.date] = map[p.date] || { sales: 0, purchases: 0 };
      map[p.date].purchases += p.total;
    });
    return Object.entries(map)
      .map(([date, vals]) => ({ date, sales: vals.sales, purchases: vals.purchases, profit: vals.sales - vals.purchases }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // latest first
  }, [sales, purchases]);

  // المنتجات الأكثر مبيعًا
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach((s) => {
      (s.items ?? []).forEach((it) => {
        map[it.productId] = map[it.productId] || { name: it.name, quantity: 0, revenue: 0 };
        map[it.productId].quantity += it.quantity;
        map[it.productId].revenue += it.price * it.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [sales]);

  const filterByDate = (arr: any[]) => {
    const from = toDate(dateFrom);
    const to = toDate(dateTo);
    if (!from && !to) return arr;
    return arr.filter((row) => {
      const d = toDate(row.date);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case "sales":
        return (
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800"><TrendingUp className="w-5 h-5" /> {t("salesReportTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">{t("date")}</TableHead>
                        <TableHead className="text-center">{t("invoicesCount")}</TableHead>
                        <TableHead className="text-center">{t("totalSalesAmount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterByDate(salesReportData).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-center">{item.date}</TableCell>
                          <TableCell className="text-center">{item.invoices}</TableCell>
                          <TableCell className="font-semibold text-blue-600 text-center">{item.total.toFixed(2)} {state.config.currency}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterByDate(salesReportData)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value} ${state.config.currency}`, t("salesReportTitle")]} />
                      <Bar dataKey="total" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "purchases":
        return (
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800"><ShoppingCart className="w-5 h-5" /> {t("purchasesReportTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("date")}</TableHead>
                    <TableHead className="text-center">{t("invoicesCount")}</TableHead>
                    <TableHead className="text-center">{t("totalPurchasesAmount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterByDate(purchaseReportData).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{item.date}</TableCell>
                      <TableCell className="text-center">{item.invoices}</TableCell>
                      <TableCell className="font-semibold text-green-600 text-center">{item.total.toFixed(2)} {state.config.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "profits":
        return (
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800"><DollarSign className="w-5 h-5" /> {t("profitsReportTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("date")}</TableHead>
                    <TableHead className="text-center">{t("totalSalesAmount")}</TableHead>
                    <TableHead className="text-center">{t("totalPurchasesAmount")}</TableHead>
                    <TableHead className="text-center">{t("netProfit")}</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filterByDate(profitReportData).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center">{item.date}</TableCell>
                    <TableCell className="text-blue-600 text-center">{item.sales.toFixed(2)} {state.config.currency}</TableCell>
                    <TableCell className="text-red-600 text-center">{item.purchases.toFixed(2)} {state.config.currency}</TableCell>
                    <TableCell
                      className={`font-semibold text-center ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {item.profit.toFixed(2)} {state.config.currency}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50 font-semibold">
                  <TableCell className="text-center">
                    {t("dateFrom")}: {fromLabel} &nbsp;→&nbsp; {t("dateTo")}: {toLabel}
                  </TableCell>
                  <TableCell className="text-blue-700 text-center">
                    {totalSales.toFixed(2)} {state.config.currency}
                  </TableCell>
                  <TableCell className="text-red-700 text-center">
                    {totalPurchases.toFixed(2)} {state.config.currency}
                  </TableCell>
                  <TableCell className={netProfit >= 0 ? "text-green-700 font-bold text-center" : "text-red-700 font-bold text-center"}>
                    {netProfit.toFixed(2)} {state.config.currency}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        );

      case "top-selling":
        return (
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800"><TrendingUp className="w-5 h-5" /> {t("topSellingTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("productName")}</TableHead>
                    <TableHead className="text-center">{t("soldQuantity")}</TableHead>
                    <TableHead className="text-center">{t("revenue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellingProducts.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-center">{it.name}</TableCell>
                      <TableCell className="text-center">{it.quantity}</TableCell>
                      <TableCell className="font-semibold text-blue-600 text-center">{it.revenue.toFixed(2)} {state.config.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Summary totals for current date range
  const filteredSales = useMemo(() => filterByDate(sales), [sales, dateFrom, dateTo]);
  const filteredPurchases = useMemo(() => filterByDate(purchases), [purchases, dateFrom, dateTo]);
  const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const netProfit = totalSales - totalPurchases;
  const fromLabel = dateFrom || t("allDates") || "جميع التواريخ";
  const toLabel = dateTo || t("today") || "اليوم";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-blue-800">{t("reportsAndStats")}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadDevices} disabled={devicesLoading}>
            {devicesLoading ? t("view") : t("licenseDevices") || "الأجهزة المربوطة"}
          </Button>
          {devicesLimit !== null && (
            <span className="text-sm text-gray-600">
              {t("licenseDevicesCount", { used: devicesList.length, max: devicesLimit === null ? "∞" : devicesLimit })}
            </span>
          )}
        </div>
      </div>
      {devicesError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {devicesError}
        </div>
      )}
      {devicesList.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-800 text-sm">{t("licenseDevicesTitle") || "Linked devices"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {devicesList.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100 text-xs"
                  title={d.id}
                >
                  <span className="truncate max-w-[140px]">
                    {d.name || d.id}
                    {d.type ? ` · ${d.type}` : ""}
                  </span>
                  <button
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    onClick={async () => {
                      setRemovingDeviceId(d.id);
                      const ok = await removeLinkedDevice(d.id);
                      if (ok) {
                        setDevicesList((prev) => prev.filter((x) => x.id !== d.id));
                      } else {
                        setDevicesError(t("errorTitle") || "Error");
                      }
                      setRemovingDeviceId("");
                    }}
                    disabled={removingDeviceId === d.id}
                    aria-label="Remove device"
                    title={t("delete") || "Delete"}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mb-3" onClick={() => setShowCurrencyPanel((v) => !v)}>
              ?? ???? ????? ???????
            </Button>
            {showCurrencyPanel && (
              <div className="flex flex-col gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50">
                <p className="text-sm text-gray-700">
                  ?????? ???????? ????????? ?????????? ????? ??? ???? ??? ?????.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>??? ?????? ????????</Label>
                    <Select value={pendingPrimaryCurrency} onValueChange={(v) => setPendingPrimaryCurrency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>??? ?????? ?????????</Label>
                    <Select value={pendingSecondaryCurrency} onValueChange={(v) => setPendingSecondaryCurrency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingPrimaryCurrency(state.config.currency || "$");
                      setPendingSecondaryCurrency(state.secondaryCurrency || "Bs");
                      setShowCurrencyPanel(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                    onClick={() => {
                      const warn =
                        t("currencyChangeWarning") || "This will change the currency symbol everywhere in the app";
                      if (!window.confirm(warn)) return;
                      dispatch({ type: "SET_CURRENCY", payload: pendingPrimaryCurrency });
                      dispatch({ type: "SET_SECONDARY_CURRENCY", payload: pendingSecondaryCurrency });
                      setShowCurrencyPanel(false);
                    }}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* قسم تعديل سعر الصرف */}
      <div className="mb-6">
        {!showRateInput ? (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={() => setShowRateInput(true)}
          >
           {t("exchangeRateEdit", { rate: state.config.exchangeRate })}

          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
              className="border p-2 rounded w-28 text-center"
              />
            <button
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              onClick={handleExchangeRateChange}
            >
              {t("exchangeRateSave")}
            </button>
            <button
              className="bg-gray-400 text-white px-3 py-2 rounded hover:bg-gray-500"
              onClick={() => setShowRateInput(false)}
            >
              {t("exchangeRateCancel")}
            </button>
          </div>
        )}
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800"><FileText className="w-6 h-6" /> {t("reportSettings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>{t("reportType")}</Label>
              <Select value={selectedReport} onValueChange={(v) => setSelectedReport(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t("reportSales")}</SelectItem>
                  <SelectItem value="purchases">{t("reportPurchases")}</SelectItem>
                  <SelectItem value="profits">{t("reportProfits")}</SelectItem>
                  <SelectItem value="top-selling">{t("reportTopSelling")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("dateFrom")}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <Label>{t("dateTo")}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500">{t("view")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderReportContent()}
    </div>
  );
};

export default ReportsSection;




