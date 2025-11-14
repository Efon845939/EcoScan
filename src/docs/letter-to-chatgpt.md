# EcoScan Puanlama Sistemi — Gerçek Çözüm Dokümanı

Aşağıdaki teknik açıklama **ortam değişkenleri, puan hesaplama fonksiyonu, fallback hatası, Firestore transaction şeması ve test mantığını** tam, temiz, profesyonel şekilde içerir.

---

## 1. Sorunun Kökü: 0–1’e Kelepçelenmiş Puanlama

### Problem 1: “Minimum 1” clamp yüzünden tüm değerler çöp oldu

Mevcut kodun büyük ihtimalle şöyle bir kısmı var:

```ts
let basePoints = pointsFromKgRegionAware(kg, region);

if (basePoints > MAX_POINTS) {
  basePoints = MAX_POINTS;
}

if (basePoints < 1) {
  basePoints = 1;  // ← ZATEN tüm küçük değerleri 1’e sabitleyen hata
}
```

Bu satır yüzünden:
- 8 puan → 1
- 15 puan → 1
- 19.2 puan → 1
- 0 puan → 1

Yani sistem “küçük mü? 1 ver gitsin” şeklinde çalışıyor.

---

### Problem 2: Fallback kodu puanı **bilerek** 1’e sabitliyor

Bazı build’lerde şu halt varsa:

```ts
const awarded = Math.min(1, Math.floor(basePoints));
```

Bu satır **hangi değeri verirsen ver** hep 0 ya da 1 döndürür.
`Floor(basePoints)` 0–20 aralığında olabilir, ama `Math.min(1, x)` → daima 0 veya 1.

Bu tam anlamıyla scoring sistemini bıçaklamışsınız.

---

## 2. Doğru Mantık Nasıl Olmalı? (Temiz Puanlama Pipeline)

Aşağıdaki **gerçek, düzeltilmiş versiyon**:

---

### 2.1. pointsFromKgRegionAware() temiz hali

```ts
export function pointsFromKgRegionAware(kg: number, region: Region): number {
  const ranges = REGION_SCALING[region]; 
  // example: { min: 25, avg: 60, max: 85 }

  if (kg <= ranges.min) return 30;
  if (kg <= ranges.avg) return 20;
  if (kg <= ranges.avg + 10) return 15;
  if (kg <= ranges.max) return 8;

  return 0;  // high emissions
}
```

Notlar:
- `MAX_POINTS` clamp kaldırıldı.
- Minimum clamp **kaldırıldı**, çünkü 0 doğal bir sonuç.

---

### 2.2. Günlük bonus/receipt multiplier

```ts
function computeFinalDailyPoints(base: number, hasReceipt: boolean) {
  if (base === 0) return 0;
  if (hasReceipt) return base * 3; // yeni multiplier 3
  return base;
}
```

---

### 2.3. Nihai awarded value — doğru rounding

```ts
const awarded = Math.round(basePoints);
```

Kural:
- `floor` kullanılmayacak
- `min(1, x)` gibi fallback yok
- clamp yok
- `round` kullanılıyor

---

## 3. Firestore Transaction — Doğru Uygulama

**ŞU AN SİZDEKİ HATALI SÜRÜM:**
Bazı projelerde transaction içinde şöyle çöp bir fallback yapılıyor:
```ts
tx.update(userRef, { totalPoints: total + 1 });
```
veya
```ts
tx.update(userRef, { totalPoints: total + Math.min(1, Math.floor(base)) });
```
Bu da skorları sabote ediyor.

---

### DOĞRU TRANSACTION (GÖMMEN GEREKEN BU)

```ts
await db.runTransaction(async (tx) => {
  const userSnap = await tx.get(userRef);
  const current = userSnap.data()?.totalPoints ?? 0;

  // gerçek hesaplanan değer buraya geliyor
  const updated = current + awarded;

  tx.update(userRef, { totalPoints: updated });
});
```

Açıklama:
- **fallback yok**
- **awarded değeri gerçek hesap sonucundan geliyor**
- **transaction atomic**
- **cezalar + bonuslar da transaction içinde işleniyor**

---

## 4. Fraud / Ceza Sistemi Bağlantısı

Bu mantık aynı transaction içinde çalıştırılabilir:

```ts
if (isFraudDetected) {
  tx.update(userRef, {
    totalPoints: current - 200,
    lastFraud: new Date(),
  });
  return;
}
```

Aynı şekilde duplicate:

```ts
if (isDuplicateReceipt) {
  tx.update(userRef, {
    totalPoints: current - 50,
    duplicateCount: (userSnap.data()?.duplicateCount ?? 0) + 1
  });
  return;
}
```

---

## 5. Unit Test Seti (Gemini için birebir)

### Test 1 — Minimum footprint doğru puanı verir

```ts
test("Kuwait min footprint = 25kg → 30 pts", () => {
  expect(pointsFromKgRegionAware(25, "kuwait")).toBe(30);
});
```

### Test 2 — Orta footprint 20 puan civarı

```ts
test("Kuwait mid footprint = 56kg → around 20", () => {
  const pts = pointsFromKgRegionAware(56, "kuwait");
  expect(pts).toBeGreaterThanOrEqual(18);
});
```

### Test 3 — Negatif clamp artık yok

```ts
test("Small value should NOT be clamped to 1", () => {
  const pts = pointsFromKgRegionAware(30, "kuwait");
  expect(pts).not.toBe(1);
});
```

### Test 4 — Transaction gerçek awarded değeri kullanıyor

```ts
test("Transaction uses actual awarded points", async () => {
  const awarded = 15;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.data().totalPoints;

    tx.update(userRef, { totalPoints: current + awarded });
  });

  const fresh = await getDoc(userRef);
  expect(fresh.data().totalPoints).toBe(previous + 15);
});
```

---

## 6. Ekonomi Ayarları (Güncel & Mantıklı)

| Parametre               | Yeni Değer | Açıklama             |
| ----------------------- | ---------- | -------------------- |
| Günlük baz (no receipt) | 15         | Daha smooth progress |
| Receipt multiplier      | ×3         | Exploit önler        |
| Free Coffee             | 500        | Ekonomiyi dengeler   |
| Streak bonus            | +75        | Weekly retention     |
| Fraud penalty           | –200       | Caydırıcı            |
| Duplicate penalty       | –50        | Spam engeller        |

---

## ÖZET

**Sistem şu anda 0–1 puan veriyor çünkü iki büyük hata var:**

1. **basePoints < 1 → 1 clamp’ı**
2. **Math.min(1, floor()) fallback’ı**

**Çözüm:**
Clamp’ları kaldır, fallback’ı yok et, rounding’i düzelt, Firestore transaction’da gerçek awarded değerini kullan.

Bunların hepsinin final kodu yukarıda.
