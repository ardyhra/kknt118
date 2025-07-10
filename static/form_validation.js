document.addEventListener('DOMContentLoaded', () => {
    // Targetkan elemen-elemen yang relevan di form
    const fileInput = document.getElementById('gambar-input');
    const errorElement = document.getElementById('file-size-error');
    const submitButton = document.getElementById('submit-btn');

    // Batas maksimal ukuran file dalam bytes (1 MB)
    const maxSizeInBytes = 1 * 1024 * 1024;

    // Pastikan elemen-elemen ada sebelum menambahkan event listener
    if (fileInput && errorElement && submitButton) {
        fileInput.addEventListener('change', function() {
            // Cek jika ada file yang dipilih
            if (this.files && this.files.length > 0) {
                const file = this.files[0];

                if (file.size > maxSizeInBytes) {
                    // Jika file terlalu besar:
                    // 1. Tampilkan pesan error yang jelas
                    errorElement.textContent = `Ukuran file tidak boleh melebihi 1 MB. Ukuran file Anda: ${(file.size / 1024 / 1024).toFixed(2)} MB.`;
                    // 2. Nonaktifkan tombol simpan
                    submitButton.disabled = true;
                    submitButton.style.cursor = 'not-allowed';
                    submitButton.style.opacity = '0.6';
                } else {
                    // Jika ukuran file valid:
                    // 1. Kosongkan pesan error
                    errorElement.textContent = '';
                    // 2. Aktifkan kembali tombol simpan
                    submitButton.disabled = false;
                    submitButton.style.cursor = 'pointer';
                    submitButton.style.opacity = '1';
                }
            }
        });
    }
});