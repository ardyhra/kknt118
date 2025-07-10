import sqlite3

# --- NAMA FILE DATABASE ---
NAMA_DATABASE = "toga.sqlite"

# --- DATA AWAL TANAMAN DENGAN PATH GAMBAR YANG BENAR ---
initial_toga_data = [
    (1, "Jahe", "Zingiber officinale", "web/images/jahe.webp", "Rimpang populer sebagai rempah-rempah dan bahan obat.", "Meredakan mual, mengurangi peradangan, dan menghangatkan tubuh.", "Direbus untuk dijadikan wedang atau dikeringkan menjadi bubuk."),
    (2, "Kunyit", "Curcuma longa", "web/images/kunyit.webp", "Rimpang berwarna kuning pekat yang kaya akan kurkumin.", "Anti-inflamasi, antioksidan, dan baik untuk kesehatan lambung.", "Diparut dan diperas untuk membuat jamu kunyit asam."),
    (3, "Lidah Buaya", "Aloe vera", "web/images/lidahbuaya.webp", "Tanaman sukulen dengan daun tebal berisi gel bening.", "Melembapkan kulit, menyembuhkan luka bakar ringan.", "Ambil gel di dalam daun dan oleskan langsung ke kulit."),
    (4, "Kencur", "Kaempferia galanga", "web/images/kencur.webp", "Rimpang dengan aroma khas yang sering digunakan untuk jamu.", "Meredakan batuk dan menambah nafsu makan.", "Dihaluskan bersama beras untuk jamu beras kencur."),
    (5, "Cabai", "Capsicum annuum", "web/images/cabe.webp", "Buah pedas yang populer sebagai bumbu.", "Sebagai antioksidan dan membantu meredakan nyeri.", "Dihaluskan menjadi sambal atau bumbu masakan."),
    (6, "Bawang Merah", "Allium cepa", "web/images/bawang_merah.webp", "Umbi yang menjadi bumbu dasar di berbagai masakan.", "Sumber serat dan kaya akan antioksidan.", "Dihaluskan sebagai bumbu dasar atau dibuat bawang goreng."),
    (7, "Sereh / Serai", "Cymbopogon citratus", "web/images/sereh.webp", "Tanaman rumput dengan aroma lemon yang khas.", "Mengurangi peradangan dan meredakan batuk.", "Digeprek dan direbus untuk minuman atau sebagai bumbu."),
    (8, "Daun Pepaya", "Carica papaya", "web/images/daun_pepaya.webp", "Daun dari pohon pepaya yang dikenal memiliki rasa pahit.", "Meningkatkan kekebalan tubuh.", "Direbus sebagai lalapan atau ditumis."),
    (9, "Jeruk Purut", "Citrus hystrix", "web/images/jeruk_purut.webp", "Jeruk dengan kulit keriput dan aroma yang sangat kuat.", "Baik untuk kekebalan tubuh dan melancarkan pencernaan.", "Daun dan kulitnya digunakan sebagai penyedap masakan."),
    (10, "Bayam", "Amaranthus spp.", "web/images/bayam.webp", "Sayuran hijau yang kaya akan zat besi.", "Sumber vitamin K dan mengandung folat.", "Direbus sebentar untuk sayur bening atau ditumis."),
    (11, "Kangkung", "Ipomoea aquatica", "web/images/kangkung.webp", "Sayuran air yang populer untuk masakan tumis.", "Mencegah anemia dan melindungi kesehatan mata.", "Ditumis dengan bumbu bawang putih atau terasi."),
    (12, "Jahe Merah", "Zingiber officinale var. rubrum", "web/images/jahe_merah.webp", "Varian jahe dengan rimpang kemerahan dan rasa lebih pedas.", "Baik untuk kekebalan tubuh.", "Direbus untuk dibuat minuman herbal (wedang).")
]

def setup_database():
    """Fungsi untuk membuat database, tabel, dan mengisi data awal."""
    try:
        conn = sqlite3.connect(NAMA_DATABASE)
        cursor = conn.cursor()
        print("Database berhasil terhubung...")

        cursor.execute("DROP TABLE IF EXISTS tanaman") # Hapus tabel lama untuk memastikan data baru
        print("Tabel lama (jika ada) berhasil dihapus.")

        cursor.execute("""
            CREATE TABLE tanaman (
                id INTEGER PRIMARY KEY,
                nama TEXT NOT NULL,
                namaLatin TEXT,
                gambar TEXT,
                deskripsiSingkat TEXT,
                manfaat TEXT,
                caraPengolahan TEXT
            )
        """)
        print("Tabel 'tanaman' berhasil dibuat.")

        print("Memasukkan data awal...")
        cursor.executemany("""
            INSERT INTO tanaman (id, nama, namaLatin, gambar, deskripsiSingkat, manfaat, caraPengolahan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, initial_toga_data)
        print(f"{len(initial_toga_data)} data tanaman berhasil dimasukkan.")

        conn.commit()
        conn.close()
        print("Setup database selesai dan koneksi ditutup.")

    except sqlite3.Error as e:
        print(f"Terjadi error pada database: {e}")

if __name__ == "__main__":
    setup_database()