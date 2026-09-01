# MarineRadar-Frontend ⚓🌐

**MyCarbons (MarineRadar)** bağımsız Web Dashboard arayüz repozituvarı.

## 🚀 Hızlı Başlangıç (Quick Start)

### 1. Bağımlılıkların Kurulumu
```bash
npm install
```

### 2. Ortam Değişkenleri Yapılandırması
`.env.example` dosyasını kopyalayarak `.env` oluşturun:
```bash
cp .env.example .env
```
`.env` içerisindeki `VITE_API_BASE_URL` değişkeninin `MarineRadar-Backend` servis URL'sine (`http://localhost:3000`) yönlendiğinden emin olun.

### 3. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```

Dashboard varsayılan olarak `http://localhost:5173` adresinde çalışmaya başlayacaktır.
