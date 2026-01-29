import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Loglama Middleware'i
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // 1. ÖNCE Auth ve API Rotalarını Kaydet
  setupAuth(app);

  // GLOBAL API KORUMASI
  // Giriş yapmamış kullanıcıların API'ye erişimini engelle
  app.use("/api", (req, res, next) => {
    // Public rotalara izin ver
    // NOT: app.use("/api") ile mount edildiği için req.path "/api" olmadan gelir! (Örn: "/login")
    const publicRoutes = ["/login", "/logout", "/user", "/health", "/integrations/webhook"];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Giriş kontrolü
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Oturum açmanız gerekiyor." });
    }

    next();
  });

  const server = await registerRoutes(app);

  // 2. ERROR HANDLER (Hataları yakala)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // throw err; // Express'te response döndükten sonra throw yapmak genelde hataya sebep olur, kaldırdım.
  });

  // 3. [KRİTİK DÜZELTME] API 404 KAPANI
  // Eğer istek /api ile başlıyorsa ve yukarıdaki 'registerRoutes' bunu yakalamadıysa,
  // HTML sayfasına düşmesine izin verme, 404 JSON dön.
  app.use('/api', (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  // 4. Vite ve Statik Dosya Sunumu (Frontend)
  // Sadece env development ise Vite'ı kur, değilse statik sun.
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 5. Sunucuyu Başlat
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
