# 🏗️ Panduan Build APK - Pencatatan CKG Puskesmas (Live Auto-Update Mode)

## Deskripsi
Folder ini berisi project **Capacitor** untuk membungkus aplikasi web **Pencatatan CKG Puskesmas Banjaran Kota** menjadi APK Android dengan fitur **Live Auto-Update**. 

> ⚡ **FITUR LIVE AUTO-UPDATE AKTIF:**
> APK ini dikonfigurasi untuk memuat langsung dari server Cloudflare (`https://ckgbankot.web.id`). 
> **Artinya:** Anda hanya perlu melakukan build APK **1 KALI SAJA** di Android Studio. Setelah itu, setiap kali ada update kodingan di masa depan, Anda **cukup jalankan `deploy.bat`** di laptop. Seluruh HP yang menginstall APK ini otomatis mendapatkan pembaruan seketika tanpa perlu build atau install ulang APK lagi!

---

## 📋 Prasyarat

Sebelum build APK, pastikan sudah terinstall:

| Software | Versi Minimum | Download |
|----------|--------------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **Android Studio** | Hedgehog+ | [developer.android.com](https://developer.android.com/studio) |
| **Java JDK** | 17+ | Terinstall bersama Android Studio |

### Setup Android Studio
1. Buka Android Studio → **SDK Manager**
2. Install **Android SDK Platform 34** (Android 14)
3. Install **Android SDK Build-Tools 34**
4. Install **Android SDK Command-line Tools**

---

## 🚀 Langkah Build APK

### Langkah 1: Install Dependencies
```bash
cd "aplikasi apk"
npm install
```

### Langkah 2: Tambah Platform Android
```bash
npx cap add android
```

### Langkah 3: Copy Network Security Config
Setelah folder `android/` terbuat, copy file konfigurasi:
```bash
# Copy network_security_config.xml ke lokasi yang benar
copy network_security_config.xml android\app\src\main\res\xml\network_security_config.xml
```

### Langkah 4: Sync Web Files ke Android
```bash
npx cap sync android
```

### Langkah 5: Buka di Android Studio
```bash
npx cap open android
```

### Langkah 6: Build APK di Android Studio
1. Tunggu Gradle sync selesai
2. Klik menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. APK akan tersedia di:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Build APK Release (Untuk Distribusi)
1. Di Android Studio, klik **Build** → **Generate Signed Bundle / APK**
2. Pilih **APK**
3. Buat atau pilih keystore file
4. Pilih **release** build variant
5. APK release tersedia di:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## ⚙️ Konfigurasi Penting

### Mengubah URL API Server
Edit file `www/app.js`, baris paling atas:
```javascript
const API_BASE_URL = 'https://aplikasi-info-ckg.pages.dev';
```
Ganti URL ini dengan URL production Cloudflare Pages Anda yang sebenarnya.

### Mengubah Nama Aplikasi
Edit `capacitor.config.json`:
```json
{
  "appName": "Pencatatan CKG"
}
```

### Mengubah Package ID
Edit `capacitor.config.json`:
```json
{
  "appId": "com.puskesmas.banjaran.ckg"
}
```

### Mengubah Ikon Aplikasi
Setelah `npx cap add android`, ganti file ikon di:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
```
Ukuran yang diperlukan:
- `mipmap-mdpi`: 48x48 px
- `mipmap-hdpi`: 72x72 px
- `mipmap-xhdpi`: 96x96 px
- `mipmap-xxhdpi`: 144x144 px
- `mipmap-xxxhdpi`: 192x192 px

💡 **Tip**: Gunakan tool [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) untuk generate ikon dari `logo.png`.

---

## 📁 Struktur Folder

```
aplikasi apk/
├── package.json                    # Dependencies & scripts
├── capacitor.config.json           # Konfigurasi Capacitor
├── network_security_config.xml     # Konfigurasi keamanan jaringan Android
├── BUILD_APK.md                    # Panduan ini
├── node_modules/                   # Dependencies (auto-generated)
├── www/                            # File web aplikasi
│   ├── index.html                  # Halaman utama (dengan meta APK)
│   ├── index.css                   # Stylesheet
│   ├── app.js                      # Logic utama (dengan API interceptor)
│   ├── charts.js                   # Chart.js manager
│   ├── wilayah-data.js             # Data wilayah Indonesia
│   └── logo.png                    # Logo aplikasi
└── android/                        # Project Android (auto-generated)
    └── app/
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/.../MainActivity.java
            ├── res/
            │   ├── xml/network_security_config.xml
            │   └── mipmap-*/ic_launcher.png
            └── assets/public/      # Web files (auto-synced)
```

---

## ❓ Troubleshooting

### "Tidak bisa konek ke server"
- Pastikan URL di `API_BASE_URL` (`www/app.js`) sudah benar
- Pastikan HP terhubung ke internet
- Cek apakah Cloudflare Pages masih aktif

### "Gradle sync failed"
- Pastikan Android SDK Platform 34 terinstall
- Cek koneksi internet (Gradle perlu download dependencies)
- File → Invalidate Caches and Restart

### "APK tidak bisa di-install"
- Aktifkan **Install dari sumber tidak dikenal** di Settings HP
- Untuk release APK: pastikan sudah ditandatangani (signed)

### "Layar putih / kosong"
- Jalankan `npx cap sync android` lagi
- Cek logcat di Android Studio untuk error detail
- Pastikan `www/` folder berisi semua file web

---

## 🔄 Update Aplikasi

Ketika ada perubahan pada aplikasi web:

1. Copy file web yang berubah ke folder `www/`
2. Jalankan `npx cap sync android`
3. Build ulang APK di Android Studio

---

## 📌 Catatan Penting

> ⚠️ **Koneksi Internet Diperlukan**: Aplikasi ini membutuhkan koneksi internet karena data disimpan di Cloudflare D1 Database. Fitur offline tidak tersedia.

> 🔒 **Keamanan**: Jangan share keystore file (.jks) jika Anda membuat release APK. Simpan keystore dengan aman karena diperlukan untuk update APK di masa depan.
