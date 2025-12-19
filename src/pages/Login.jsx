import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // 👈 إضافة الترجمة
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User } from "lucide-react";

const Login = ({ onLogin }) => {
  const { t } = useTranslation(); // 🧠 استدعاء الدالة t للترجمة
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (username === "Admin" && password === "admin425") {
      onLogin("admin");
    } else if (username === "Worker" && password === "1234") {
      onLogin("employee");
    } else {
      setError(t("login.invalidCredentials")); // ✅ ترجمة الخطأ
    }
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
            {/* اسم المستخدم */}
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <Input
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* كلمة المرور */}
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

            {/* رسالة الخطأ */}
            {error && (
              <p className="text-red-500 text-sm text-center font-medium">{error}</p>
            )}

            {/* زر الدخول */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition"
            >
              {t("login.button")}
            </Button>

            {/* نص توضيحي */}
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
