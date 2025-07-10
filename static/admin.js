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

            // Wrapper untuk tombol aksi agar konsisten
            row.innerHTML = ` 
                <td>${tanaman.id}</td>
                <td><img src="${imageUrl}" alt="${tanaman.nama}" class="table-img"></td>
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
            `;
            tableBody.appendChild(row);
        });
    }

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