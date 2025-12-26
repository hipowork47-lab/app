import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User, ShieldCheck } from "lucide-react";
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
    pullSnapshot().then((snap) => {
      if (snap?.accounts) {
        applyAccountsSnapshot(snap.accounts);
        setAccounts(loadAccounts());
      }
    });
  }, []);
// معالجة إرسال نموذج تسجيل الدخول

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
// البحث عن الحساب المطابق
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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Card className="relative w-[360px] sm:w-[420px] max-w-full mx-auto bg-white/90 shadow-2xl backdrop-blur-lg border border-white/40">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">{t("welcome")}</span>
          </div>
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
  );
};

export default Login;
