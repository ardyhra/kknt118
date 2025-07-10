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

# --- ROUTE UNTUK API ANDA ---
@app.route('/api/tanaman', methods=['GET'])
def get_tanaman():
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanaman")
    # fetchall() sekarang akan mengembalikan list of Row objects
    rows = cursor.fetchall()
    conn.close()
    # Ubah list of Row objects menjadi list of dictionaries agar menjadi JSON yang valid
    return jsonify([dict(row) for row in rows])

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