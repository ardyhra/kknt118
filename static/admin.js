document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allAdminData = []; // Variabel untuk menyimpan semua data dari server
    let currentSortBy = 'id';
    let currentOrder = 'asc'; // Default sort by newest ID
    let currentSearchTerm = '';
    let currentPage = 1;
    const itemsPerPage = 10; // Tampilkan 10 item per halaman di admin

    // --- ELEMEN DOM ---
    const tableBody = document.getElementById('toga-table-body');
    const searchInput = document.getElementById('admin-search-input');
    const paginationContainer = document.getElementById('admin-pagination-container');
    const adminModal = document.getElementById('admin-modal');
    const modalImage = document.getElementById('modal-image');
    const modalQRCodeContainer = document.getElementById('modal-qrcode');
    const modalActions = document.getElementById('modal-actions');
    const downloadQRBtn = document.getElementById('download-qr-btn');
    const closeModalBtn = document.querySelector('.admin-modal-close');

    // --- FUNGSI UTAMA UNTUK MEMPROSES DAN MENAMPILKAN DATA ---
    // Fungsi ini TIDAK melakukan fetch, hanya memproses data yang sudah ada.
    function updateTableView() {
        // 1. Filter data berdasarkan pencarian
        let processedData = allAdminData.filter(tanaman => {
            const searchTerm = currentSearchTerm.toLowerCase();
            return (
                tanaman.nama.toLowerCase().includes(searchTerm) ||
                (tanaman.namaLatin && tanaman.namaLatin.toLowerCase().includes(searchTerm))
            );
        });

        // 2. Urutkan data yang sudah difilter
        processedData.sort((a, b) => {
            const valA = a[currentSortBy] ? a[currentSortBy].toString().toLowerCase() : '';
            const valB = b[currentSortBy] ? b[currentSortBy].toString().toLowerCase() : '';

            if (currentSortBy === 'id') {
                return currentOrder === 'asc' ? valA - valB : valB - valA;
            }

            if (valA < valB) return currentOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Paginate the data
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = processedData.slice(startIndex, endIndex);

        // 4. Render the table with the paginated data
        renderTable(paginatedData);

        // 5. Setup pagination controls based on the total filtered items
        updateSortIndicators(currentSortBy, currentOrder);
        setupAdminPagination(processedData.length);
    }

    // Fungsi untuk mengambil data dari server (HANYA SEKALI saat halaman dimuat)
    async function initialFetch() {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Memuat data...</td></tr>';
        try {
            const response = await fetch(`/admin`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            allAdminData = await response.json(); // Simpan data ke variabel global
            // Panggil updateTableView untuk pertama kali
            updateTableView();
        } catch (error) {
            console.error("Gagal mengambil data tabel:", error);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Gagal memuat data.</td></tr>';
        }
    }

    // Fungsi baru untuk generate semua QR Code di tabel
    function generateAllQRCodes() {
        const containers = document.querySelectorAll('.qrcode-container');
        containers.forEach(container => {
            // Hapus QR code lama jika ada
            container.innerHTML = ''; 
            // Ambil URL dari atribut data
            const url = container.dataset.url;
            if (url) {
                new QRCode(container, {
                    text: url,
                    width: 80,
                    height: 80,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        });
    }

    // Fungsi untuk membangun baris tabel dari data JSON
    function renderTable(data) {
        tableBody.innerHTML = ''; // Kosongkan isi tabel sebelumnya

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Tidak ada data ditemukan.</td></tr>';
            return;
        }

        data.forEach(tanaman => {
            const row = document.createElement('tr');
            const imageUrl = tanaman.gambar ? `/static/${tanaman.gambar}` : '';
            // Buat URL lengkap untuk QR Code
            const detailUrl = `${window.location.origin}/tanaman/${tanaman.id}`;

            // Wrapper untuk tombol aksi agar konsisten
            row.innerHTML = ` 
                <td>${tanaman.id}</td>
                <td><img src="${imageUrl}" alt="${tanaman.nama}" class="table-img table-img-clickable"></td>
                <td>${tanaman.nama}</td>
                <td>${tanaman.namaLatin || ''}</td>
                <td>
                    <div class="action-buttons">
                        <a href="/admin/edit/${tanaman.id}" class="btn-edit">Edit</a>
                        <form action="/admin/delete/${tanaman.id}" method="POST" onsubmit="return confirm('Apakah Anda yakin ingin menghapus tanaman ini?');">
                            <button type="submit" class="btn-delete">Hapus</button>
                        </form>
                    </div>
                </td>
                <td>
                    <div class="qrcode-container qrcode-clickable" data-url="${detailUrl}"></div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Panggil fungsi untuk generate QR code setelah semua baris ditambahkan
        generateAllQRCodes(); 
    }

    // --- LOGIKA BARU UNTUK MODAL ---

    // Fungsi untuk membuka modal
    function openAdminModal() {
        if (adminModal) adminModal.style.display = 'flex';
    }

    // Fungsi untuk menutup modal
    function closeAdminModal() {
        if (adminModal) adminModal.style.display = 'none';
    }

    // Event delegation untuk seluruh body tabel
    tableBody.addEventListener('click', (e) => {
        // Cek jika yang diklik adalah gambar
        if (e.target.classList.contains('table-img-clickable')) {
            modalImage.src = e.target.src;
            modalImage.style.display = 'block';
            modalQRCodeContainer.style.display = 'none';
            modalActions.style.display = 'none';
            openAdminModal();
        }

        // Cek jika yang diklik adalah container QR code (atau gambar di dalamnya)
        const qrContainer = e.target.closest('.qrcode-clickable');
        if (qrContainer) {
            const url = qrContainer.dataset.url;
            modalQRCodeContainer.innerHTML = ''; // Kosongkan dulu

            // Buat QR Code yang lebih besar di dalam modal
            new QRCode(modalQRCodeContainer, {
                text: url, width: 256, height: 256,
            });

            modalImage.style.display = 'none';
            modalQRCodeContainer.style.display = 'block';
            modalActions.style.display = 'block';
            openAdminModal();
        }
    });

    // Event listener untuk tombol download
    downloadQRBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Mencegah aksi default dari link
 
        // Cari elemen canvas yang dibuat oleh qrcode.js di dalam modal
        const originalCanvas = modalQRCodeContainer.querySelector('canvas');
        if (!originalCanvas) return;
 
        const padding = 20; // Ukuran frame putih di sekeliling QR code
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
 
        // Atur ukuran canvas baru, lebih besar dari yang asli
        newCanvas.width = originalCanvas.width + padding * 2;
        newCanvas.height = originalCanvas.height + padding * 2;
 
        // 1. Isi canvas baru dengan background putih
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
 
        // 2. Gambar QR code asli di tengah canvas baru
        ctx.drawImage(originalCanvas, padding, padding);
 
        // 3. Buat link sementara untuk memicu download secara andal
        const tempLink = document.createElement('a');
        tempLink.download = 'qrcode-toga.png'; // Beri nama file yang lebih deskriptif
        tempLink.href = newCanvas.toDataURL('image/png');
        document.body.appendChild(tempLink); // Link harus ada di DOM untuk diklik
        tempLink.click();
        document.body.removeChild(tempLink); // Hapus link setelah selesai
    });

    // Event listener untuk tombol close dan background modal
    closeModalBtn.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            closeAdminModal();
        }
    });

    // --- LOGIKA SORTING DAN PAGINASI ---
    // Fungsi untuk memperbarui indikator panah (▲/▼) di header
    function updateSortIndicators(sortBy, order) {
        document.querySelectorAll('th.sortable .sort-indicator').forEach(span => span.textContent = '');
        const activeHeader = document.querySelector(`th[data-sort="${sortBy}"] .sort-indicator`);
        if (activeHeader) {
            activeHeader.textContent = order === 'asc' ? ' ▲' : ' ▼';
        }
    }

    // Fungsi untuk membuat tombol-tombol paginasi di halaman admin
    function setupAdminPagination(totalItems) {
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(totalItems / itemsPerPage);

        if (pageCount <= 1) return;

        // Tombol "Previous"
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '&laquo;';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateTableView();
            }
        });
        paginationContainer.appendChild(prevBtn);

        // Tombol Angka Halaman
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.className = 'page-btn';
            btn.innerText = i;
            if (i === currentPage) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                currentPage = i;
                updateTableView();
            });
            paginationContainer.appendChild(btn);
        }

        // Tombol "Next"
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '&raquo;';
        nextBtn.disabled = currentPage === pageCount;
        nextBtn.addEventListener('click', () => {
            if (currentPage < pageCount) {
                currentPage++;
                updateTableView();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }


    // Tambahkan event listener untuk setiap header yang bisa disortir
    document.querySelectorAll('th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.dataset.sort;

            if (sortBy === currentSortBy) {
                // Jika kolom sama, balik urutannya
                currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Jika kolom baru, mulai dengan 'asc'
                currentSortBy = sortBy;
                currentOrder = 'asc';
            }
            currentPage = 1; // Kembali ke halaman pertama saat sort

            updateTableView(); // Panggil fungsi pemrosesan lokal
        });
    });

    // Tambahkan event listener untuk input pencarian
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        currentPage = 1; // Kembali ke halaman pertama saat mencari
        updateTableView(); // Panggil fungsi pemrosesan lokal
    });

    // Panggil fungsi untuk pertama kali saat halaman dimuat
    initialFetch();
});