import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ŞİFRE VE KULLANICI ADINI BURADAN AYARLIYORUZ
    // Render'dan Environment Variable olarak çekeceğiz
    const validUser = import.meta.env.VITE_ADMIN_USER || "admin";
    const validPass = import.meta.env.VITE_ADMIN_PASS || "123456";

    if (username === validUser && password === validPass) {
      // Başarılı giriş
      localStorage.setItem("medkampus_auth", "true");
      onUnlock();
    } else {
      setError("Hatalı kullanıcı adı veya şifre!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">MedKampüs Yönetim</CardTitle>
          <p className="text-sm text-gray-500">Lütfen giriş yapınız</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kullanıcı Adı</label>
              <Input 
                type="text" 
                placeholder="Admin"
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Şifre</label>
              <Input 
                type="password" 
                placeholder="******"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <Button type="submit" className="w-full">Giriş Yap</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
