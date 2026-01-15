import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/5 z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse delay-1000" />

      <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 relative z-10 glow-md backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/50 rounded-2xl flex items-center justify-center shadow-lg mb-4 glow-sm transform rotate-45 group hover:rotate-0 transition-all duration-500">
            <Lock className="w-8 h-8 text-primary-foreground transform -rotate-45 group-hover:rotate-0 transition-all duration-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-neon text-center">MedKampüs</h1>
          <p className="text-muted-foreground mt-2 text-center">Yönetim Paneli Girişi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Kullanıcı Adı</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                <User className="w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 focus:ring-primary/50 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Şifre</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 focus:ring-primary/50 text-base"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-[1.02]"
          >
            Giriş Yap
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground/50">
          &copy; 2025 MedKampüs v2.0
        </div>
      </div>
    </div>
  );
}
