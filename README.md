# Voxel 3D by Faisal — Android WebView project

Proyek ini membungkus game web kamu ke aplikasi Android WebView.

## Build APK otomatis melalui GitHub Actions

1. Buat repository GitHub baru.
2. Ekstrak ZIP proyek ini, lalu unggah **isi folder proyek** ke root repository (file `settings.gradle`, `build.gradle`, folder `app`, dan `.github` harus terlihat di root).
3. Pastikan Actions diizinkan pada repository.
4. Buka tab **Actions**. Workflow **Build Android APK** berjalan otomatis setelah push. Kamu juga bisa memilih **Run workflow**.
5. Buka proses build terbaru yang selesai, lalu unduh artifact **android-apk-debug** pada bagian Artifacts.
6. Ekstrak artifact dan pasang file APK di perangkat Android untuk pengujian.

## Info proyek

- Nama aplikasi: Voxel 3D by Faisal
- Halaman utama ZIP: `index.html`
- Android Gradle Plugin: 8.13.2
- Gradle: 8.13
- JDK: 17
- compileSdk: 35 · minSdk: 23 · targetSdk: 35
- Output: APK Debug (belum ditandatangani sebagai rilis Play Store)

## Catatan kompatibilitas

- Semua file dari folder game terpilih ditempatkan di `app/src/main/assets/www/`.
- Halaman utama dipasang sebagai `index.html`.
- JavaScript, DOM Storage, WebGL melalui WebView, dan media playback diaktifkan.
- Game yang memakai CDN atau API online memerlukan izin internet dan koneksi internet.
- File yang mengandalkan plugin browser, server-side runtime (Node/PHP), akses filesystem khusus, atau native SDK tidak otomatis menjadi kompatibel. Game tersebut mungkin perlu diadaptasi.
- APK Debug cocok untuk uji coba. Untuk distribusi publik, buat konfigurasi signing release dan lindungi keystore serta password-nya.

## Struktur

```
app/                    Android app module
  src/main/
    assets/www/         File game HTML/CSS/JS dan aset
    java/               MainActivity WebView
    res/                Resource Android
.github/workflows/      Workflow build otomatis
build.gradle            Plugin Android Gradle
settings.gradle         Konfigurasi proyek
```
