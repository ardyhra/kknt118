# Impor render_template dari flask
from flask import Flask, jsonify, request, render_template, session, redirect, url_for, flash
import sqlite3
import os
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from functools import wraps

# Beritahu Flask di mana folder file statis (CSS, JS) berada
app = Flask(__name__)

# --- KONFIGURASI APLIKASI ---
# Kunci rahasia ini WAJIB untuk menggunakan session
app.secret_key = 'kunci_rahasia_yang_sangat_aman_dan_sulit_ditebak'

# Folder untuk menyimpan gambar yang di-upload
app.config['UPLOAD_FOLDER'] = 'static/web/images'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
# Batasi ukuran upload file menjadi 1 MB
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024 # 1 MB

def db_connection():
    conn = None
    try:
        conn = sqlite3.connect('toga.sqlite')
        conn.row_factory = sqlite3.Row # Ini akan membuat hasil query bisa diakses seperti dictionary
    except sqlite3.error as e:
        print(e)
    return conn

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# --- ERROR HANDLER UNTUK FILE TERLALU BESAR ---
@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def request_entity_too_large(error):
    flash('Ukuran file terlalu besar. Maksimal 1 MB.', 'danger')
    # Redirect kembali ke URL form yang sama tempat upload gagal.
    # Ini lebih andal daripada request.referrer.
    return redirect(request.url)

# --- DECORATOR UNTUK OTENTIKASI ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- ROUTE BARU UNTUK HALAMAN UTAMA ---
@app.route('/')
def index():
    # Perintah ini akan mencari 'index.html' di dalam folder 'templates'
    return render_template('index.html')

# Tambahkan di bagian ROUTE UNTUK HALAMAN UTAMA
@app.route('/tanaman/<int:id>')
def detail_tanaman(id):
    conn = db_connection()
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (id,)).fetchone()
    resep_list = conn.execute('SELECT * FROM resep WHERE tanaman_id = ? ORDER BY nama_resep', (id,)).fetchall()
    conn.close()
    if tanaman is None:
        return "Tanaman tidak ditemukan", 404
    # Kita akan membuat template detail_tanaman.html di langkah berikutnya
    return render_template('detail_tanaman.html', tanaman=tanaman)

# --- ROUTE UNTUK API ANDA ---
@app.route('/api/tanaman', methods=['GET'])
def get_tanaman():
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanaman ORDER BY nama")
    tanaman_list = [dict(row) for row in cursor.fetchall()]

    # Ambil resep untuk setiap tanaman
    for tanaman in tanaman_list:
        cursor.execute("SELECT * FROM resep WHERE tanaman_id = ? ORDER BY nama_resep", (tanaman['id'],))
        tanaman['resep'] = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return jsonify(tanaman_list)


# --- ROUTE UNTUK FITUR BLOG/ARTIKEL ---

@app.route('/artikel')
def artikel_list():
    conn = db_connection()
    all_artikel = conn.execute('SELECT * FROM artikel ORDER BY tanggal_publikasi DESC').fetchall()
    conn.close()
    return render_template('artikel_list.html', all_artikel=all_artikel)

@app.route('/artikel/<int:id>')
def artikel_detail(id):
    conn = db_connection()
    artikel = conn.execute('SELECT * FROM artikel WHERE id = ?', (id,)).fetchone()
    conn.close()
    if artikel is None:
        return "Artikel tidak ditemukan", 404
    return render_template('artikel_detail.html', artikel=artikel)

@app.route('/admin/artikel/add', methods=['GET', 'POST'])
@login_required
def add_artikel():
    if request.method == 'POST':
        judul = request.form['judul']
        isi = request.form['isi']
        gambar = request.files['gambar']
        gambar_path = None
        if gambar and allowed_file(gambar.filename):
            filename = secure_filename(gambar.filename)
            gambar.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            # Simpan path relatif terhadap 'static'
            gambar_path = f"web/images/{filename}"
        
        conn = db_connection()
        conn.execute('INSERT INTO artikel (judul, isi, gambar_header) VALUES (?, ?, ?)',
                     (judul, isi, gambar_path))
        conn.commit()
        conn.close()
        flash(f"Artikel '{judul}' berhasil ditambahkan.", 'success')
        return redirect(url_for('admin_dashboard')) # Arahkan ke dashboard utama setelah sukses

    return render_template('form_artikel.html', title="Tambah Artikel Baru", artikel={})

@app.route('/admin/artikel/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_artikel(id):
    conn = db_connection()
    artikel = conn.execute('SELECT * FROM artikel WHERE id = ?', (id,)).fetchone()

    if request.method == 'POST':
        judul = request.form['judul']
        isi = request.form['isi']
        gambar = request.files['gambar']

        gambar_path = artikel['gambar_header'] # Gunakan gambar lama sebagai default
        if gambar and allowed_file(gambar.filename):
            filename = secure_filename(gambar.filename)
            gambar.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            gambar_path = f"web/images/{filename}"

        conn.execute('UPDATE artikel SET judul = ?, isi = ?, gambar_header = ? WHERE id = ?',
                     (judul, isi, gambar_path, id))
        conn.commit()
        flash(f"Artikel '{judul}' berhasil diperbarui.", 'success')
        return redirect(url_for('admin_dashboard'))

    conn.close()
    return render_template('form_artikel.html', title="Edit Artikel", artikel=artikel)

# --- ROUTE UNTUK CRUD RESEP ---

@app.route('/admin/tanaman/<int:tanaman_id>/resep')
@login_required
def manage_resep(tanaman_id):
    conn = db_connection()
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (tanaman_id,)).fetchone()
    if not tanaman:
        conn.close()
        return "Tanaman tidak ditemukan.", 404
    
    resep_list = conn.execute('SELECT * FROM resep WHERE tanaman_id = ? ORDER BY nama_resep', (tanaman_id,)).fetchall()
    conn.close()
    return render_template('manage_resep.html', tanaman=tanaman, resep_list=resep_list)


@app.route('/admin/resep/add/<int:tanaman_id>', methods=['GET', 'POST'])
@login_required
def add_resep(tanaman_id):
    conn = db_connection()
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (tanaman_id,)).fetchone()

    if request.method == 'POST':
        nama_resep = request.form['nama_resep']
        bahan = request.form['bahan']
        langkah_pembuatan = request.form['langkah_pembuatan']

        conn.execute('INSERT INTO resep (nama_resep, bahan, langkah_pembuatan, tanaman_id) VALUES (?, ?, ?, ?)',
                     (nama_resep, bahan, langkah_pembuatan, tanaman_id))
        conn.commit()
        conn.close()
        flash(f"Resep '{nama_resep}' berhasil ditambahkan untuk {tanaman['nama']}.", 'success')
        return redirect(url_for('admin_dashboard'))

    conn.close()
    return render_template('form_resep.html', title="Tambah Resep Baru", tanaman=tanaman, resep={})

@app.route('/admin/resep/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_resep(id):
    conn = db_connection()
    resep = conn.execute('SELECT * FROM resep WHERE id = ?', (id,)).fetchone()
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (resep['tanaman_id'],)).fetchone()

    if request.method == 'POST':
        nama_resep = request.form['nama_resep']
        bahan = request.form['bahan']
        langkah_pembuatan = request.form['langkah_pembuatan']

        conn.execute('UPDATE resep SET nama_resep = ?, bahan = ?, langkah_pembuatan = ? WHERE id = ?',
                     (nama_resep, bahan, langkah_pembuatan, id))
        conn.commit()
        conn.close()
        flash(f"Resep '{nama_resep}' berhasil diperbarui.", 'success')
        return redirect(url_for('admin_dashboard'))

    conn.close()
    return render_template('form_resep.html', title="Edit Resep", tanaman=tanaman, resep=resep)

@app.route('/admin/resep/delete/<int:id>', methods=['POST']) # Perbaiki parameter jadi <int:id>
@login_required
def delete_resep(id):
    conn = db_connection()
    resep = conn.execute('SELECT * FROM resep WHERE id = ?', (id,)).fetchone()
    if resep:
        conn.execute('DELETE FROM resep WHERE id = ?', (id,))
        conn.commit()
        flash(f"Resep '{resep['nama_resep']}' telah dihapus.", 'success')
    conn.close()
    return redirect(url_for('admin_dashboard'))

# --- ROUTE UNTUK OTENTIKASI ADMIN ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Untuk kesederhanaan, kita hardcode username dan password
        # Di aplikasi nyata, ini harus diperiksa dari database
        if request.form['username'] == 'admin' and request.form['password'] == 'admin123':
            session['logged_in'] = True
            flash('Anda berhasil login!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Username atau Password salah.', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    session.pop('logged_in', None)
    flash('Anda telah logout.', 'info')
    return redirect(url_for('index'))

# --- ROUTE UNTUK CRUD PANEL ADMIN ---

@app.route('/admin')
@login_required
def admin_dashboard():
    # Cek apakah ini adalah permintaan AJAX dari JavaScript
    # Jika ya, kirim semua data tanaman tanpa filter atau sort dari server.
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        conn = db_connection()
        # Query sederhana untuk mengambil semua data.
        all_tanaman = conn.execute('SELECT * FROM tanaman').fetchall()
        conn.close()
        # Untuk permintaan AJAX, kembalikan hanya data dalam format JSON
        return jsonify([dict(row) for row in all_tanaman])

    # Untuk permintaan biasa (load halaman awal), cukup render template HTML-nya
    return render_template('admin.html')

@app.route('/admin/add', methods=['GET', 'POST'])
@login_required
def add_tanaman():
    if request.method == 'POST':
        nama = request.form['nama']
        namaLatin = request.form['namaLatin']
        deskripsiSingkat = request.form['deskripsiSingkat']
        manfaat = request.form['manfaat']
        caraPengolahan = request.form['caraPengolahan']
        gambar = request.files['gambar']

        gambar_path = None
        if gambar and allowed_file(gambar.filename):
            filename = secure_filename(gambar.filename)
            gambar.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            gambar_path = f"web/images/{filename}"

        conn = db_connection()
        conn.execute('INSERT INTO tanaman (nama, namaLatin, deskripsiSingkat, manfaat, caraPengolahan, gambar) VALUES (?, ?, ?, ?, ?, ?)',
                     (nama, namaLatin, deskripsiSingkat, manfaat, caraPengolahan, gambar_path))
        conn.commit()
        conn.close()
        flash(f"Tanaman '{nama}' berhasil ditambahkan.", 'success')
        return redirect(url_for('admin_dashboard'))

    return render_template('form_tanaman.html', title="Tambah Tanaman", tanaman={})

@app.route('/admin/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_tanaman(id):
    conn = db_connection()
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (id,)).fetchone()

    if request.method == 'POST':
        nama = request.form['nama']
        namaLatin = request.form['namaLatin']
        deskripsiSingkat = request.form['deskripsiSingkat']
        manfaat = request.form['manfaat']
        caraPengolahan = request.form['caraPengolahan']
        gambar = request.files['gambar']

        gambar_path = tanaman['gambar'] # Gunakan gambar lama sebagai default
        if gambar and allowed_file(gambar.filename):
            # Hapus gambar lama jika ada dan jika bukan gambar default
            if gambar_path and os.path.exists(os.path.join('static', gambar_path)):
                 # Tambahkan logika untuk tidak menghapus gambar yang dipakai data lain jika perlu
                 pass
            
            filename = secure_filename(gambar.filename)
            gambar.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            gambar_path = f"web/images/{filename}"

        conn.execute('UPDATE tanaman SET nama = ?, namaLatin = ?, deskripsiSingkat = ?, manfaat = ?, caraPengolahan = ?, gambar = ? WHERE id = ?',
                     (nama, namaLatin, deskripsiSingkat, manfaat, caraPengolahan, gambar_path, id))
        conn.commit()
        conn.close()
        flash(f"Tanaman '{nama}' berhasil diperbarui.", 'success')
        return redirect(url_for('admin_dashboard'))

    conn.close()
    return render_template('form_tanaman.html', title="Edit Tanaman", tanaman=tanaman)

@app.route('/admin/delete/<int:id>', methods=['POST'])
@login_required
def delete_tanaman(id):
    conn = db_connection()
    # Ambil record lengkap untuk mendapatkan path gambar
    tanaman = conn.execute('SELECT * FROM tanaman WHERE id = ?', (id,)).fetchone()

    if tanaman:
        # Hapus file gambar dari server jika ada
        if tanaman['gambar']:
            try:
                # Buat path file yang lengkap dari root folder 'static'
                file_path = os.path.join('static', tanaman['gambar'])
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                # Jika gagal menghapus file, catat error tapi jangan hentikan proses
                print(f"Error saat menghapus file {tanaman['gambar']}: {e}")

        # Hapus record dari database
        conn.execute('DELETE FROM tanaman WHERE id = ?', (id,))
        conn.commit()
        flash(f"Tanaman '{tanaman['nama']}' telah dihapus.", 'success')
    else:
        flash('Tanaman tidak ditemukan.', 'danger')

    conn.close()
    return redirect(url_for('admin_dashboard'))

if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True, port=5000)