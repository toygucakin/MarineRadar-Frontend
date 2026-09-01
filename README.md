# MarineRadar-Frontend ⚓🌐

**MyCarbons (MarineRadar)** bağımsız Web Dashboard arayüz repozituvarı.

> [!NOTE]
> Bu repozituvar, projenin **Frontend (Web Dashboard)** arayüzünü içermektedir. Bağımsız REST API ve Yapay Zeka boru hattı servisi için [MarineRadar-Backend](https://github.com/toygucakin/MarineRadar-Backend) deposunu ziyaret edebilirsiniz.

---

## 🌟 Temel Özellikler

- **Modern Eco-Design Arayüz:** Nane/zümrüt yeşili kurumsal tema, karanlık ve aydınlık kart tasarımları.
- **Akıllı Haber Akışı & Filtreleme:** Arama, etiket filtreleme, akıllı sayfalama (`1 2 3 ... N`) ve gemiye özel süzme.
- **Kişiselleştirilmiş Filo Paneli:** JWT oturum açma, filo gemileri ekleme/çıkarma ve kişiselleştirilmiş haber akışı.
- **Google Gemini AI Kartları:** Haber detayında anlık İngilizce AI karbonsuzlaşma analiz notları ve etki puanı göstergeleri.
- **Bülten & Dergi Modalı:** Özel dergi kapağı formatında yayınlanan MyCarbons bülten arşivi.

---

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
`.env` içerisindeki `VITE_API_BASE_URL` değişkeninin `MarineRadar-Backend` servis URL'sine (`http://localhost:3000`) yönlendiğinden emin olun:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```

Dashboard varsayılan olarak `http://localhost:5173` adresinde çalışmaya başlayacaktır.

---

## 🐳 Docker ile Prodüksiyon Sunumu (Nginx Alpine)

```bash
docker-compose up --build
```
Nginx Alpine sunucusu üzerinde statik prodüksiyon çıktısı port `5173` üzerinden sunulacaktır.

---

## 🔗 İlgili Repozituvarlar

- 🟢 **Frontend Repo:** [MarineRadar-Frontend](https://github.com/toygucakin/MarineRadar-Frontend)
- 🔵 **Backend Repo:** [MarineRadar-Backend](https://github.com/toygucakin/MarineRadar-Backend)
