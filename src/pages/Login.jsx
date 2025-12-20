import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User, ShieldCheck, Sparkles } from "lucide-react";
import { applyAccountsSnapshot, loadAccounts } from "@/lib/accounts";
import { pullSnapshot } from "@/lib/sync-adapter";

const Login = ({ onLogin }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const isRTL = (t("login.title") || "").match(/[\u0600-\u06FF]/);

  useEffect(() => {
    setAccounts(loadAccounts());
    // حاول جلب أحدث الحسابات من المزامنة إذا توفرت
    pullSnapshot().then((snap) => {
      if (snap?.accounts) {
        applyAccountsSnapshot(snap.accounts);
        setAccounts(loadAccounts());
      }
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const found = accounts.find(
      (acc) =>
        acc.username.toLowerCase() === username.toLowerCase() &&
        acc.password === password
    );

    if (found) {
      onLogin({ username: found.username, role: found.role });
      return;
    }

    setError(t("login.invalidCredentials"));
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-blue-500/10 to-transparent" />
      </div>

      <div className="container relative mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-2 items-center justify-center">
          {/* Brand / intro side */}
          <div className="text-white space-y-6 hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">{t("welcome")}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
              {t("login.title")} <span className="text-blue-200">POS</span>
            </h1>
            <p className="text-blue-100/80 leading-relaxed max-w-xl">
              {t("reports")} · {t("login.adminAccount")} · {t("login.workerAccount")}
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                t("purchaseInvoices"),
                t("salesInvoices"),
                t("products"),
                t("reports"),
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-blue-100"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Login card */}
          <div className="flex justify-center">
            <Card className="relative w-full max-w-md bg-white/90 shadow-2xl backdrop-blur-lg border border-white/40">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-2xl font-bold text-slate-900 text-center">
                  {t("login.title")}
                </CardTitle>
                <p className="text-center text-sm text-slate-600">
                  {t("login.adminAccount")}: <b>Admin / admin425</b> · {t("login.workerAccount")}:{" "}
                  <b>Worker / 1234</b>
                </p>
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      {t("login.username")}
                    </label>
                    <Input
                      placeholder={t("login.username")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/60"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      {t("login.password")}
                    </label>
                    <Input
                      type="password"
                      placeholder={t("login.password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500/60"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {t("login.button")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
