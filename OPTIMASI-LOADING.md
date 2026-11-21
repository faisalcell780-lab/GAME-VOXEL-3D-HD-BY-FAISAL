# Catatan Optimasi Loading BLOCKREALM

Perubahan pada versi ini berfokus pada waktu masuk ke dunia, tanpa menghapus konten game:

- Menghindari pembuatan dunia secara sinkron di konstruktor yang sebelumnya langsung diulang oleh pemuat progresif.
- Memulai permainan segera setelah area spawn, karakter, dan NPC siap; chunk yang lebih jauh tetap dimuat bertahap selama permainan.
- Menyiapkan lampu dekoratif dan foam tepian air sesudah pemain masuk ke dunia, bukan menahannya di layar loading.
- Mempercepat pemindaian sumber cahaya dengan membaca buffer voxel secara berurutan sambil mempertahankan urutan kandidat yang dipakai sebelumnya.
- Menghapus jeda buatan 200 ms sebelum masuk ke permainan.
- Menambahkan pembatalan pemuatan agar proses lama tidak bertabrakan dengan proses mulai ulang.
- Memperbaiki alur mulai dunia baru setelah kembali ke menu.

Model, tekstur, ukuran dunia, chunk, fitur, dan pengaturan efek tidak dihapus atau sengaja diturunkan.

## Build

Jalankan `npm install`, lalu `npm run build`. Hasil build Vite akan dibuat di folder `dist`.
