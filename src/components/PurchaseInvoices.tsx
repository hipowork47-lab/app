// src/components/PurchaseInvoices.tsx
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/store/store";
import { useTranslation } from "react-i18next";

type LineItem = {
  productId: string | null;
  name: string;
  quantity: number;
  price: number;
  description?: string;
};

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const PurchaseInvoices: React.FC = () => {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  const [supplier, setSupplier] = useState("");
  const [lineName, setLineName] = useState("");
  const [lineQty, setLineQty] = useState<number | "">(1);
  const [linePrice, setLinePrice] = useState<number | "">("");
  const [lineDesc, setLineDesc] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const addLine = () => {
    if (!lineQty || !linePrice || Number(lineQty) <= 0 || Number(linePrice) <= 0) {
      toast({
        title: t("errorTitle"),
        description: t("errorInvalidLine"),
        variant: "destructive",
      });
      return;
    }

    const existing = state.products.find((p) => p.name === lineName);
    const productId = existing ? existing.id : null;

    setItems((s) => [
      ...s,
      {
        productId,
        name: existing ? existing.name : t("productName"),
        quantity: Number(lineQty),
        price: Number(linePrice),
        description: lineDesc,
      },
    ]);

    setLineName("");
    setLineQty(1);
    setLinePrice("");
    setLineDesc("");
  };

  const removeLine = (idx: number) =>
    setItems((s) => s.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const printInvoice = (invoice: any) => {
    if (typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const rate = invoice.exchangeRate ?? state.config.exchangeRate;
    const rows = (invoice.items ?? [])
      .map(
        (it: any) =>
          `<tr>
            <td>${it.name}</td>
            <td>${it.description || "-"}</td>
            <td style="text-align:center">${it.quantity}</td>
            <td style="text-align:center">${it.price.toFixed(2)} ${state.config.currency}</td>
            <td style="text-align:center">${(it.price * it.quantity).toFixed(2)} ${state.config.currency}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${t("purchaseInvoices")} - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background: #e5e7eb; text-align: right; }
          </style>
        </head>
        <body>
          <h2>${t("purchaseInvoices")} - ${invoice.invoiceNumber}</h2>
          <div>${t("purchaseSupplierLabel")}: ${invoice.supplier}</div>
          <div>${t("purchaseDateLabel")}: ${invoice.date}</div>
          <div>${t("purchaseTotal")}: ${invoice.total?.toFixed(2)} ${state.config.currency}</div>
          <div>${t("purchaseRateNote", { rate })}</div>
          <table>
            <thead>
              <tr>
                <th>${t("productName")}</th>
                <th>${t("itemNotePlaceholder")}</th>
                <th style="text-align:center">${t("quantity")}</th>
                <th style="text-align:center">${t("unitPrice")}</th>
                <th style="text-align:center">${t("invoiceTotal")}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const createInvoice = () => {
    if (!supplier) {
      toast({
        title: t("errorTitle"),
        description: t("errorSupplierRequired"),
        variant: "destructive",
      });
      return;
    }
    if (items.length === 0) {
      toast({
        title: t("errorTitle"),
        description: t("errorItemsRequired"),
        variant: "destructive",
      });
      return;
    }

    // جهز العناصر للإرسال: لو المنتج غير مرتبط (null) ننشئ id مؤقت للحقل productId
    const payloadItems = items.map((it) => ({
      productId: it.productId ?? genId(),
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      price: it.price,
    }));

    dispatch({
      type: "ADD_PURCHASE",
      payload: {
        supplier,
        items: payloadItems,
        invoiceMeta: { exchangeRate: state.config.exchangeRate },
      },
    });

    toast({
      title: t("purchaseCreatedTitle"),
      description: t("purchaseCreatedDesc"),
      variant: "default",
    });

    setSupplier("");
    setItems([]);
  };

  return (
    <div className="space-y-10">
      {/* ===== بطاقة إنشاء فاتورة ===== */}
      <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-lg rounded-2xl">
        <CardHeader className="border-b border-blue-100 pb-3">
          <CardTitle className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            🧾 {t("purchaseCreateTitle")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 mt-4">
          {/* الحقول */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder={t("supplierPlaceholder")}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="rounded-xl border-blue-200 focus:ring-2 focus:ring-blue-300"
            />

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">{t("selectProductLabel")}</label>
        <select
  value={lineName}
  onChange={(e) => setLineName(e.target.value)}
  className="border rounded-xl p-2 focus:ring-2 focus:ring-blue-300 focus:outline-none border-blue-200"
>
  <option value="">{t("selectProductPlaceholder")}</option>
  {(state.products ?? [])
    .filter((p) => !p.deleted) // ✅ لا تعرض المنتجات المحذوفة
    .map((p) => (
      <option key={p.id} value={p.name}>
        {p.name}
      </option>
    ))}
</select>

            </div>

            <Input
              placeholder={t("itemNotePlaceholder")}
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
              className="rounded-xl border-blue-200 focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* الكمية والسعر */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Input
                type="number"
                placeholder={t("quantityPlaceholder")}
                value={lineQty as number}
                onChange={(e) => setLineQty(Number(e.target.value))}
                className="rounded-xl border-blue-200 focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="number"
                placeholder={t("unitPricePlaceholder")}
                value={linePrice as number}
                onChange={(e) => setLinePrice(Number(e.target.value))}
                className="rounded-xl border-blue-200 focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <Button
              onClick={addLine}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2 shadow-md transition"
            >
              ➕ {t("addLine")}
            </Button>
          </div>

          {/* الجدول */}
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-6 italic">
              {t("noItemsYet")}
            </div>
          ) : (
            <div className="overflow-hidden border border-blue-100 rounded-xl shadow-sm">
              <table className="w-full border-collapse">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    <th className="p-3 text-center font-semibold">{t("productName")}</th>
                    <th className="p-3 text-center font-semibold">{t("itemNotePlaceholder")}</th>
                    <th className="p-3 text-center font-semibold">{t("quantity")}</th>
                    <th className="p-3 text-center font-semibold">{t("unitPrice")}</th>
                    <th className="p-3 text-center font-semibold">{t("invoiceTotal")}</th>
                    <th className="p-3 text-center font-semibold">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {items.map((it, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50 transition duration-150"
                    >
                      <td className="p-3 text-center">{it.name}</td>
                      <td className="p-3 text-center text-gray-600">
                        {it.description || "-"}
                      </td>
                      <td className="p-3 text-center">{it.quantity}</td>
                      <td className="p-3 text-center">
                        {it.price.toFixed(2)} {state.config.currency}
                      </td>
                      <td className="p-3 text-center font-semibold text-blue-700">
                        {(it.price * it.quantity).toFixed(2)} {state.config.currency}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeLine(idx)}
                          className="rounded-lg px-3 py-1"
                        >
                          {t("delete")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* الإجمالي */}
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-b-xl">
                <div className="font-bold text-lg text-blue-800">
                  {t("purchaseTotal")}: {total.toFixed(2)} {state.config.currency}
                  <div className="text-sm text-gray-600">
                    {(total * state.config.exchangeRate).toFixed(2)} Bs
                  </div>
                </div>

                <Button
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 py-2 shadow-md"
                  onClick={createInvoice}
                >
                  💾 {t("createPurchaseInvoice")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== الفواتير السابقة ===== */}
      <div className="bg-white shadow-md rounded-2xl p-5 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">
          🧩 {t("recentPurchasesTitle")}
        </h3>
        {(state.purchases ?? []).length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            {t("noPurchasesYet")}
          </div>
        ) : (
          <div className="space-y-6">
           {[...(state.purchases ?? [])]
  .sort((a, b) => b.id.localeCompare(a.id))
  .map((p) => (

              <div
                key={p.id}
                className="border border-blue-100 rounded-xl shadow-sm p-4 hover:shadow-md transition duration-200 bg-gradient-to-br from-blue-50 to-white"
              >
                {/* رأس الفاتورة */}
                <div className="flex flex-wrap justify-between items-center border-b border-blue-100 pb-2 mb-3">
                  <div className="text-sm text-gray-700">
                    <div>
                      <span className="font-semibold text-blue-800">{t("purchaseInvoiceNumberLabel")}:</span>{" "}
                      {p.invoiceNumber}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-800">{t("purchaseSupplierLabel")}:</span>{" "}
                      {p.supplier}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-800">{t("purchaseDateLabel")}:</span>{" "}
                      {p.date}
                    </div>
                  </div>

                  <div className="text-right font-semibold text-blue-700">
                    <div>
                      {t("purchaseTotal")}: {p.total.toFixed(2)} {state.config.currency}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(p.total * (p.exchangeRate ?? state.config.exchangeRate)).toFixed(2)} Bs
                    </div>
                    {p.exchangeRate && (
                      <div className="text-xs text-gray-400">
                        ({t("purchaseRateNote", { rate: p.exchangeRate })})
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenId(openId === p.id ? null : p.id)}
                    >
                      {openId === p.id ? t("close") : t("details")}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => printInvoice(p)}>
                      🖨️ {t("print")}
                    </Button>
                  </div>
                </div>

                {/* تفاصيل المنتجات */}
                {openId === p.id && (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full border border-blue-100 rounded-xl text-sm text-center">
                      <thead className="bg-blue-100 text-blue-800">
                        <tr>
                          <th className="p-2 border text-center">{t("productName")}</th>
                          <th className="p-2 border text-center">{t("itemNotePlaceholder")}</th>
                          <th className="p-2 border text-center">{t("quantity")}</th>
                          <th className="p-2 border text-center">{t("unitPrice")}</th>
                          <th className="p-2 border text-center">{t("invoiceTotal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.items ?? []).map((it: any, i: number) => (
                          <tr key={i} className="hover:bg-blue-50 transition">
                            <td className="p-2 border">{it.name}</td>
                            <td className="p-2 border text-gray-600">
                              {it.description || "-"}
                            </td>
                            <td className="p-2 border text-center">{it.quantity}</td>
                            <td className="p-2 border text-center">
                              {it.price.toFixed(2)} {state.config.currency}
                            </td>
                            <td className="p-2 border text-center font-semibold text-blue-700">
                              {(it.price * it.quantity).toFixed(2)} {state.config.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseInvoices;
