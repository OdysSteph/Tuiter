# TubesFE

Aplikasi web **media sosial sederhana** (mirip microblog) yang dibuat sebagai Tugas Besar Pengembangan Aplikasi Web. Pengguna dapat mendaftar, login, membuat postingan, mengikuti pengguna lain, dan melihat timeline dari orang yang diikuti.

Proyek ini terdiri dari dua bagian:

- **`client`** — frontend SPA dengan SolidJS + Vite
- **`server`** — REST API dengan Express.js

## Fitur

- Registrasi, login, dan logout berbasis sesi (cookie `express-session`)
- Timeline berisi postingan sendiri dan postingan dari pengguna yang diikuti
- Membuat dan menghapus postingan (hanya milik sendiri)
- Pencarian postingan dan pencarian pengguna
- Follow / unfollow pengguna
- Halaman profil: bio, jumlah postingan, followers, dan following
- Edit profil (nama, username, bio, password) dan unggah foto profil (JPG, PNG, GIF, maks. 5 MB)
- Proteksi halaman: halaman tertentu hanya bisa diakses setelah login

## Tech Stack

| Bagian | Teknologi |
| ------ | --------- |
| Client | [SolidJS](https://www.solidjs.com/), [@solidjs/router](https://github.com/solidjs/solid-router), [Vite](https://vitejs.dev/), CSS |
| Server | [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), express-session, cors, body-parser, multer |
| Data | File `server/data.js` (penyimpanan sederhana tanpa database) |

## Struktur Folder

```
TubesFE/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx            # Konfigurasi routing
│       ├── authStore.js       # State autentikasi
│       ├── followStore.js     # State follow
│       ├── components/        # Layout, Navbar, Logo, Profile
│       ├── pages/             # Login, Register, Timeline, Post, People, Profile
│       ├── styles/            # File CSS per halaman
│       └── assets/            # Logo dan foto profil
└── server/
    ├── index.js               # Server dan semua endpoint API
    └── data.js                # Data users, posts, dan follows
```

## Prasyarat

- [Node.js](https://nodejs.org/) (disarankan versi LTS terbaru)
- npm (atau pnpm / yarn)
- Git

## Instalasi dan Menjalankan

### 1. Clone repository

```bash
git clone https://github.com/StephIsHere/TubesFE.git
cd TubesFE
```

### 2. Jalankan server (port 3001)

```bash
cd server
npm install
node index.js
```

Server berjalan di `http://localhost:3001`. Port dapat diubah lewat environment variable `PORT`.

### 3. Jalankan client (port 3000)

Buka terminal baru:

```bash
cd client
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

> Server harus berjalan lebih dulu karena client memanggil API di `http://localhost:3001`.

## Scripts

| Perintah | Folder | Fungsi |
| -------- | ------ | ------ |
| `npm run dev` / `npm start` | client | Menjalankan mode development |
| `npm run build` | client | Build production ke folder `dist` |
| `npm run serve` | client | Preview hasil build |
| `node index.js` | server | Menjalankan server API |

## Akun Demo

Data awal di `server/data.js` sudah berisi akun contoh, misalnya:

| Username | Password |
| -------- | -------- |
| `jdoe42` | `12345` |
| `janedoe` | `919191` |

Atau buat akun baru lewat halaman **Register**.

## Dokumentasi API

Semua endpoint berprefix `/api`. Endpoint bertanda 🔒 membutuhkan login.

| Method | Endpoint | Fungsi |
| ------ | -------- | ------ |
| POST | `/login` | Login |
| POST | `/register` | Registrasi akun |
| POST | `/logout` | Logout |
| GET | `/auth/check` | Cek status login |
| GET 🔒 | `/posts` | Daftar postingan (query: `timeline`, `search`, `userId`) |
| POST 🔒 | `/posts` | Buat postingan |
| DELETE 🔒 | `/posts/:postId` | Hapus postingan milik sendiri |
| GET 🔒 | `/users` | Daftar pengguna (query: `search`) |
| GET 🔒 | `/users/:userId` | Detail profil pengguna |
| GET 🔒 | `/users/:userId/stats` | Jumlah postingan, followers, following |
| GET 🔒 | `/users/:userId/connections` | Daftar followers dan following |
| POST 🔒 | `/follow/:userId` | Follow pengguna |
| DELETE 🔒 | `/follow/:userId` | Unfollow pengguna |
| PUT 🔒 | `/profile` | Update profil |
| POST 🔒 | `/profile/picture` | Unggah foto profil |

## Catatan

Proyek ini ditujukan untuk keperluan tugas kuliah, sehingga ada beberapa hal yang belum cocok untuk production:

- Data disimpan di file `data.js`, bukan database.
- Password disimpan sebagai teks biasa (belum di-hash).
- `secret` session masih di-hardcode di `server/index.js`.
- CORS hanya mengizinkan `http://localhost:3000` dan `http://localhost:5173`.
