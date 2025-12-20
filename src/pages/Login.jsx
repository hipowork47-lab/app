import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User } from "lucide-react";
import { applyAccountsSnapshot, loadAccounts } from "@/lib/accounts";
import { pullSnapshot } from "@/lib/sync-adapter";

const Login = ({ onLogin }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState([]);

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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      dir="rtl"
    >
      <Card className="w-full max-w-sm shadow-lg bg-white/80 backdrop-blur-sm border border-blue-100">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-blue-700">
            {t("login.title")}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <Input
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              <Input
                type="password"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition"
            >
              {t("login.button")}
            </Button>

            <p className="text-center text-gray-500 text-xs mt-3">
              {t("login.adminAccount")}: <b>Admin / admin425</b> <br />
              {t("login.workerAccount")}: <b>Worker / 1234</b>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
