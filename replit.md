# MedKampüs - Ödeme ve Hakediş Takip Sistemi

## Proje Özeti

MedKampüs, YKS (Üniversite Sınavı) koçluğu sunan bir platformdur. Bu sistem, platformun finansal akışını (öğrenci ödemeleri ve koç hakedişleri) yönetmek için tasarlanmıştır.

## Temel İş Modeli

- **Öğrenci Ödemesi**: Öğrenciler 1-12 aylık paketlerden birini seçer ve tüm ücreti peşin öder
- **Koç Hakedişi**: Koçlar, her aktif öğrenci için aylık sabit bir ücret (varsayılan: 1100 TL) alır
- **Ödeme Günü**: Tüm koçlara toplu ödeme her ayın belirli bir gününde (varsayılan: 28) yapılır
- **Kıstelyevm Hesaplama**: Ödemeler baseDays ayarına göre prorata hesaplanır (varsayılan: 31 gün)

## Teknik Mimari

### Frontend
- React + TypeScript
- Wouter (routing)
- TanStack Query (data fetching)
- Shadcn UI (component library)
- Tailwind CSS (styling)
- Turkish language support
- Material Design principles

### Backend
- Express.js
- PostgreSQL (Neon)
- Drizzle ORM
- Type-safe API endpoints

### Database Schema

1. **system_settings**: Global sistem ayarları
   - coachMonthlyFee: Koç aylık ücreti
   - baseDays: Günlük ücret hesaplama bazı (28-31 gün)
   - globalPaymentDay: Ödeme günü (1-31)

2. **coaches**: Koç bilgileri
   - firstName, lastName, email, phone (zorunlu)
   - iban: IBAN bilgisi (opsiyonel)
   - isActive: Aktif/arşiv durumu

3. **students**: Öğrenci bilgileri
   - firstName, lastName, email, phone (zorunlu)
   - coachId: Atanan koç
   - packageMonths: Paket süresi (1-12 ay)
   - packageStartDate, packageEndDate
   - isActive: Aktif/arşiv durumu

4. **payment_records**: Ödeme geçmişi
   - coachId, paymentDate
   - totalAmount, studentCount
   - breakdown: Öğrenci bazında detaylar
   - status: Ödeme durumu (pending/paid)
   - paidAt, paidBy, notes

5. **coach_transfers**: Koç değişiklik geçmişi
   - studentId, oldCoachId, newCoachId
   - transferDate: Transfer tarihi
   - notes: Transfer notları

6. **coach_payrolls**: Dönem bazlı hakediş kayıtları
   - coachId, periodMonth (YYYY-MM format)
   - totalAmount, studentCount
   - breakdown: JSON detay verisi
   - status: pending/paid
   - paidAt, paidBy, notes
   - Unique constraint: (coachId, periodMonth) - Çift kayıt engellenir

7. **student_payments**: Öğrenci ödeme geçmişi
   - studentId, coachId
   - periodStart, periodEnd, amount
   - Gap-aware hesaplama için kullanılır

## API Endpoints

### System Settings
- `GET /api/settings` - Ayarları getir
- `PUT /api/settings` - Ayarları güncelle

### Coaches
- `GET /api/coaches` - Tüm koçları listele
- `GET /api/coaches/:id` - Koç detayı
- `POST /api/coaches` - Yeni koç ekle
- `PUT /api/coaches/:id` - Koç güncelle
- `DELETE /api/coaches/:id` - Koç arşivle

### Students
- `GET /api/students` - Tüm öğrencileri listele
- `GET /api/students/:id` - Öğrenci detayı
- `POST /api/students` - Yeni öğrenci ekle (initialPayment ile ilk ödeme kaydı oluşturur)
- `PUT /api/students/:id` - Öğrenci güncelle
- `DELETE /api/students/:id` - Öğrenci arşivle

### Dashboard & Payments
- `GET /api/dashboard/enhanced-stats` - Gelişmiş istatistikler (5 kart: aktif koç, aktif öğrenci, beklenen ödeme, bekleyen hakediş, gecikmiş öğrenci)
- `GET /api/dashboard/renewal-alerts` - Paket yenileme uyarıları
- `GET /api/payments/current-month` - Güncel ay hakediş hesaplaması
- `POST /api/coach-payrolls/calculate/:period` - Dönem bazlı hakediş hesapla (YYYY-MM)
- `GET /api/coach-payrolls/period/:period` - Dönem hakediş kayıtlarını getir
- `PUT /api/coach-payrolls/:id/mark-paid` - Hakedişi ödenmiş işaretle
- `POST /api/students/:id/renew` - Legacy paket yenileme
- `POST /api/students/:id/smart-renew` - Akıllı paket yenileme (3 mod)
- `GET /api/students/:id/last-payment` - Son ödeme bilgisi
- `GET /api/students/:id/payments` - Ödeme geçmişi

### Coach Transfers
- `POST /api/students/:id/transfer-coach` - Öğrencinin koçunu değiştir
- `GET /api/students/:id/transfer-history` - Öğrencinin koç geçmişi

### Excel Export
- `GET /api/export/students` - Öğrenci listesi Excel export
- `GET /api/export/coaches` - Koç listesi Excel export
- `GET /api/export/payrolls/:period` - Dönem hakediş Excel export (özet + detay sayfaları)

## Kıstelyevm (Prorated) Hesaplama Mantığı

Sistem, koç ödemelerini şu mantıkla hesaplar:

1. **Ödeme Döngüsü**: Bir önceki ödeme gününden (dahil değil) mevcut ödeme gününe (dahil)
   - Örnek: Ödeme günü 28 ise → 29 Ekim - 28 Kasım arası

2. **Günlük Ücret**: `Aylık Ücret / baseDays gün`

3. **Öğrenci Bazında Hesaplama**:
   - Öğrencinin paket başlangıç ve bitiş tarihleri kontrol edilir
   - Ödeme döngüsü içinde çalışılan günler hesaplanır
   - Hakediş = Günlük Ücret × Çalışılan Gün Sayısı

4. **Koç Değişikliği Durumunda**:
   - Eğer öğrenci ödeme döngüsü içinde koç değiştirmişse:
     * Eski koç: Transfer tarihinden önceki günler için ödeme alır
     * Yeni koç: Transfer tarihinden itibaren günler için ödeme alır
   - Her koç sadece öğrenciyle çalıştığı günler için hakediş alır
   - Transfer geçmişi `coach_transfers` tablosunda saklanır

5. **Özel Durumlar**:
   - Yeni başlayan öğrenci: Başlangıç tarihinden ödeme gününe kadar
   - Paketi biten öğrenci: Son ödeme gününden bitiş tarihine kadar
   - Tam ay çalışan: Tam aylık ücret

## Akıllı Paket Yenileme Sistemi

Öğrenci paketlerini yenilemek için 3 modlu akıllı sistem:

### Seçenek 1: Hızlı Yenileme (Quick)
- Açıklama: "Öğrenci mevcut tarifesinden devam ediyor"
- Son ödeme tutarı ve süresi otomatik algılanır
- Tek tıkla işlem tamamlanır
- UI: Tüm alanlar salt okunur

### Seçenek 2: Fiyat Güncelleme (Price Update)
- Açıklama: "Paket süresi aynı, fiyata zam geldi"
- Paket süresi korunur (son ödemeden)
- Sadece tutar manuel girilir
- UI: Süre alanı kilitli, tutar alanı açık

### Seçenek 3: Paket Değişikliği (Package Switch)
- Açıklama: "Öğrenci farklı süredeki pakete geçiyor"
- Yeni süre ve tutar manuel girilir
- UI: Tüm alanlar açık (1-12 ay)

### API Kullanımı
```javascript
// Hızlı Yenileme
POST /api/students/:id/smart-renew
{ "mode": "quick" }

// Fiyat Güncelleme
POST /api/students/:id/smart-renew
{ "mode": "price_update", "amount": "2500" }

// Paket Değişikliği
POST /api/students/:id/smart-renew
{ "mode": "package_switch", "packageMonths": 3, "amount": "7000" }
```

## Sayfa Yapısı

### Ana Sayfa (Dashboard)
- 5 istatistik kartı:
  * Aktif Koç sayısı
  * Aktif Öğrenci sayısı
  * Beklenen Aylık Ödeme
  * Bekleyen Hakediş (ödenmemiş dönemler)
  * Gecikmiş Öğrenci (paketi bitmiş)
- Paket yenileme uyarıları (7 gün kala / süresi dolmuş)

### Öğrenciler
- Tüm öğrencilerin listesi
- Arama ve filtreleme
- Kalan gün badge'leri (yeşil >7 gün, sarı ≤7 gün, kırmızı süresi dolmuş)
- Paket yenileme butonu (gap tespit ile)
- Excel export butonu
- Öğrenci ekleme/düzenleme/arşivleme

### Koçlar
- Tüm koçların listesi
- Aktif öğrenci sayıları
- Excel export butonu
- Koç ekleme/düzenleme/arşivleme

### Ödemeler
- Dönem seçici (ay/yıl navigasyonu, YYYY-MM format)
- Dönem bazlı hakediş hesaplama
- Koç kartları (pending/paid durumu)
- "Ödendi" olarak işaretleme
- Excel export butonu (özet + detay sayfaları)
- Kıstelyevm hesaplaması ile detaylı döküm

### Ayarlar
- Koç aylık hakediş ücreti
- Global ödeme günü
- Tüm hesaplamaları etkileyen global parametreler

## Geliştirme

```bash
npm install
npm run dev
```

## Veritabanı Yönetimi

```bash
# Schema değişikliklerini uygula
npm run db:push

# Schema değişikliklerini zorla uygula
npm run db:push --force
```

## Önemli Notlar

1. Öğrenci eklendiğinde paket bitiş tarihi otomatik hesaplanır
2. Arşivlenen kayıtlar silinmez, sadece isActive=0 yapılır
3. Koç arşivlenirken aktif öğrencisi varsa uyarı verilir
4. Tüm tarih ve saat hesaplamaları date-fns kütüphanesi ile yapılır
5. Para birimi TL (Türk Lirası) olarak gösterilir
6. Tüm metinler Türkçe'dir
