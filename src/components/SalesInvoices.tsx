// src/components/SalesInvoices.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, FileText, Calendar, User, Printer } from "lucide-react";
import { useStore } from "@/store/store";

const SalesInvoices = () => {
  const { t, i18n } = useTranslation();
  const { state } = useStore();
  const { sales, config } = state;
// حالة الفاتورة المحددة

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="w-6 h-6" />
            {t("salesInvoices")}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t("total")}: {sales.length} {t("salesInvoices")}
          </p>
        </CardHeader>
      </Card>

      {/* Sales Invoices List */}
      <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Receipt className="w-5 h-5" />
            {t("salesInvoices")} ({sales.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{t("previousInvoices")}</p>
              <p className="text-sm mt-2">{t("emptyCartDesc")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...sales].sort((a, b) => b.id.localeCompare(a.id)).map((invoice) => (
                <Card
                  key={invoice.id}
                  className="border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setIsInvoiceDialogOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {invoice.invoiceNumber}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {invoice.items.length} {t("products")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {invoice.date} - {invoice.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {invoice.cashier}
                          </div>
                        </div>
                      </div>
                     <div className="text-left space-y-1">
  {/* السعر الإجمالي بالدولار */}
  <div className="text-lg font-bold text-blue-600">
    {invoice.total.toFixed(2)} {config.currency}
  </div>

  {/* 💵 بما يعادل بالبوليفار */}
  {config.currency === "$" && (
    <div className="text-sm text-gray-600">
      💱 {(invoice.total * (invoice.exchangeRate ?? config.exchangeRate)).toFixed(2)} Bs
      <div className="text-xs text-gray-400">
        1$ = {invoice.exchangeRate ?? config.exchangeRate} Bs
      </div>
    </div>
  )}

  {/* زر عرض التفاصيل */}
  <Button variant="ghost" size="sm" className="mt-1">
    {t("details") || "عرض التفاصيل"}
  </Button>
</div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {t("invoiceNumber")}: {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">{t("invoiceNumber")}</span>
                  <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t("date")}</span>
                  <p className="font-semibold">{selectedInvoice.date}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t("time") || "الوقت"}</span>
                  <p className="font-semibold">{selectedInvoice.time}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t("mainCashier")}</span>
                  <p className="font-semibold">{selectedInvoice.cashier}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t("paymentMethod")}</span>
                  <p className="font-semibold">
                    {selectedInvoice.paymentMethod === "cash"
                      ? t("cash") + " 💵"
                      : selectedInvoice.paymentMethod === "card"
                      ? t("card") + " 💳"
                      : selectedInvoice.paymentMethod === "transfer"
                      ? t("transfer") + " 🏦"
                      : t("noPaymentTitle")}
                  </p>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("addProduct")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead className="text-center">{t("productName")}</TableHead>
                    <TableHead className="text-center">{t("unitPrice")}</TableHead>
                    <TableHead className="text-center">{t("quantity")}</TableHead>
                    <TableHead className="text-center">{t("total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-center">{item.name}</TableCell>
                        <TableCell className="text-center">
                          {item.price.toFixed(2)} {config.currency}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="font-semibold text-center">
                          {(item.price * item.quantity).toFixed(2)} {config.currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Invoice Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>{t("invoiceTotal")}</span>

                  {/* 💵 المبلغ الإجمالي مع التحويل للبوليفار */}
                  <span className="text-blue-600">
                    {selectedInvoice.total.toFixed(2)} {config.currency}
                    {config.currency === "$"  && (
  <div className="text-right text-sm text-gray-600">
    <p>
      💱 {t("equivalentTo")}{" "}
      <span className="font-semibold text-blue-600">
        {(selectedInvoice.total * (selectedInvoice.exchangeRate ?? config.exchangeRate)).toFixed(2)} Bs
      </span>
    </p>
    <p className="text-xs text-gray-500">
      {t("exchangeRateInfo", { rate: selectedInvoice.exchangeRate ?? config.exchangeRate })}
    </p>
  </div>
)}

                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                  onClick={() => {
                    if (!selectedInvoice) return;
                    const win = window.open("", "_blank", "width=900,height=700");
                    if (!win) return;
                    const rate = selectedInvoice.exchangeRate ?? config.exchangeRate;
                    const rows = selectedInvoice.items
                      .map(
                        (it) =>
                          `<tr>
                            <td>${it.name}</td>
                            <td style="text-align:center">${it.price.toFixed(2)} ${config.currency}</td>
                            <td style="text-align:center">${it.quantity}</td>
                            <td style="text-align:center">${(it.price * it.quantity).toFixed(2)} ${config.currency}</td>
                          </tr>`
                      )
                      .join("");

                    win.document.write(`
                      <html dir="rtl">
                        <head>
                          <title>${t("salesInvoices")} - ${selectedInvoice.invoiceNumber}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 16px; }
                            h2 { margin-bottom: 8px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                            th, td { border: 1px solid #d1d5db; padding: 8px; }
                            th { background: #e5e7eb; text-align: right; }
                          </style>
                        </head>
                        <body>
                          <h2>${t("salesInvoices")} - ${selectedInvoice.invoiceNumber}</h2>
                          <div>${t("date")}: ${selectedInvoice.date}</div>
                          <div>${t("time") || "time"}: ${selectedInvoice.time}</div>
                          <div>${t("mainCashier")}: ${selectedInvoice.cashier}</div>
                          <div>${t("paymentMethod")}: ${selectedInvoice.paymentMethod}</div>
                          <div>${t("invoiceTotal")}: ${selectedInvoice.total.toFixed(2)} ${config.currency}</div>
                          <div>${t("exchangeRateInfo", { rate })}</div>
                          <table>
                            <thead>
                              <tr>
                                <th>${t("productName")}</th>
                                <th style="text-align:center">${t("unitPrice")}</th>
                                <th style="text-align:center">${t("quantity")}</th>
                                <th style="text-align:center">${t("total")}</th>
                              </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                          </table>
                        </body>
                      </html>
                    `);
                    win.document.close();
                    win.focus();
                    win.print();
                    win.close();
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {t("print") || "طباعة الفاتورة"}
                </Button>
                <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                  {t("close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesInvoices;
