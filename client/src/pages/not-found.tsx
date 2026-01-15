import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/5 z-0" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse opacity-50" />

      <Card className="glass-card w-full max-w-md mx-4 border-none shadow-xl relative z-10 glow-sm">
        <CardContent className="pt-6 pb-6 text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-4xl font-bold text-gradient-neon mb-2">404</h1>
            <h2 className="text-xl font-semibold text-foreground">Sayfa Bulunamadı</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground mb-8">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>

          <Link href="/">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300">
              <Home className="mr-2 h-4 w-4" />
              Ana Sayfaya Dön
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
