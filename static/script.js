document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allTogaData = []; // Menyimpan semua data asli dari API
    let filteredAndSortedData = []; // Menyimpan data setelah difilter dan diurutkan
    let currentSortOrder = 'asc'; // Default sort order: 'asc' (A-Z) or 'desc' (Z-A)
    let currentPage = 1;
    let itemsPerPage = 5; // Nilai default, akan diupdate dari dropdown

    // --- ELEMEN DOM ---
    const grid = document.getElementById('toga-grid');
    const searchInput = document.getElementById('search-input');
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.modal-close');
    const sortAscBtn = document.getElementById('sort-asc');
    const sortDescBtn = document.getElementById('sort-desc');
    const itemsPerPageSelect = document.getElementById('items-per-page');
    const paginationContainer = document.getElementById('pagination-container');
    const scanBtn = document.getElementById('scan-qr-btn');
    const qrReaderElement = document.getElementById('qr-reader');
    // Inisialisasi scanner
    const html5QrCode = new Html5Qrcode("qr-reader");

    // Fungsi yang akan dijalankan jika scan berhasil
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`Scan berhasil: ${decodedText}`);
        
        // Hentikan scanner setelah berhasil
        html5QrCode.stop().then((ignore) => {
          qrReaderElement.style.display = "none";
          scanBtn.textContent = "Scan QR Code Tanaman"; // Reset teks tombol setelah berhasil
          console.log("QR Code scanning is stopped.");
        }).catch((err) => {
          console.log("Gagal menghentikan scanner.", err);
        });

        // Ekstrak ID dari URL yang di-scan
        // Contoh URL: http://127.0.0.1:5000/tanaman/5
        try {
            const url = new URL(decodedText);
            const pathParts = url.pathname.split('/');
            const plantId = pathParts[pathParts.length - 1]; // Ambil bagian terakhir dari path

            if (plantId && !isNaN(plantId)) {
                // Panggil fungsi modal yang sudah ada!
                openModal(plantId); 
            } else {
                alert("QR Code tidak valid.");
            }
        } catch(e) {
            console.error("Format URL dari QR code tidak valid.", e);
            alert("QR Code tidak valid.");
        }
    };

    // Konfigurasi scanner
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Event listener untuk tombol Scan
    scanBtn.addEventListener('click', () => {
        if (scanBtn.textContent === "Scan QR Code Tanaman") {
            qrReaderElement.style.display = "block";
            scanBtn.textContent = "Tutup Scan QR";
            // Mulai scanner
            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
        } else {
            html5QrCode.stop().then(() => {
                qrReaderElement.style.display = "none";
                scanBtn.textContent = "Scan QR Code Tanaman";
                console.log("QR Code scanning is stopped.");
            }).catch(err => {
                console.error("Gagal menghentikan scanner.", err);
                alert("Gagal menutup scanner.");
            });
        }
    });    
    
    // --- FUNGSI UTAMA UNTUK MEMPROSES DAN MENAMPILKAN DATA ---
    function updateDisplay() {
        // 1. Filter data berdasarkan pencarian
        const searchTerm = searchInput.value.toLowerCase();
        let processedData = allTogaData.filter(tanaman =>
            tanaman.nama.toLowerCase().includes(searchTerm)
        );

        // 2. Urutkan data yang sudah difilter
        processedData.sort((a, b) => {
            const nameA = a.nama.toLowerCase();
            const nameB = b.nama.toLowerCase();
            if (currentSortOrder === 'asc') {
                return nameA.localeCompare(nameB); // Cara modern untuk sort string
            } else {
                return nameB.localeCompare(nameA);
            }
        });

        filteredAndSortedData = processedData;

        // 3. Tampilkan data untuk halaman saat ini dan buat tombol paginasi
        displayPaginatedData();
        setupPagination();
    }

    // --- FUNGSI UNTUK MERENDER KARTU SESUAI HALAMAN ---
    function displayPaginatedData() {
        grid.innerHTML = '';
        if (filteredAndSortedData.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">Tanaman tidak ditemukan.</p>`;
            paginationContainer.innerHTML = ''; // Kosongkan paginasi juga
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredAndSortedData.slice(startIndex, endIndex);

        pageItems.forEach(tanaman => {
            const card = document.createElement('div');
            card.className = 'toga-card';
            card.dataset.id = tanaman.id;

            // Path gambar sekarang relatif terhadap folder 'static'
            const imagePath = `/static/${tanaman.gambar}`;

            card.innerHTML = `
                <img src="${imagePath}" alt="${tanaman.nama}">
                <div class="toga-card-content">
                    <h3>${tanaman.nama}</h3>
                    <p>${tanaman.deskripsiSingkat}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // --- FUNGSI UNTUK MEMBUAT TOMBOL-TOMBOL PAGINASI ---
    function setupPagination() {
        paginationContainer.innerHTML = '';
        const pageCount = Math.ceil(filteredAndSortedData.length / itemsPerPage);

        if (pageCount <= 1) return; // Tidak perlu tombol jika hanya 1 halaman

        // --- Tombol "Previous" ---
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '&laquo;'; // Karakter panah kiri
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateDisplay();
            }
        });
        if (currentPage === 1) {
            prevBtn.disabled = true; // Nonaktifkan jika di halaman pertama
        }
        paginationContainer.appendChild(prevBtn);

        // --- Tombol Angka Halaman ---
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.className = 'page-btn';
            btn.innerText = i;
            if (i === currentPage) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                currentPage = i;
                updateDisplay();
            });
            paginationContainer.appendChild(btn);
        }

        // --- Tombol "Next" ---
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '&raquo;'; // Karakter panah kanan
        nextBtn.addEventListener('click', () => {
            if (currentPage < pageCount) {
                currentPage++;
                updateDisplay();
            }
        });
        if (currentPage === pageCount) {
            nextBtn.disabled = true; // Nonaktifkan jika di halaman terakhir
        }
        paginationContainer.appendChild(nextBtn);
    }

    // --- FUNGSI UNTUK MENGAMBIL DATA DARI API ---
    async function fetchTogaData() {
        try {
            const response = await fetch('/api/tanaman');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allTogaData = await response.json();

            // Atur nilai awal dari dropdown
            itemsPerPage = parseInt(itemsPerPageSelect.value, 10);

            // Tampilkan data dengan urutan default (A-Z) saat pertama kali load
            updateDisplay();
        } catch (error) {
            console.error("Gagal mengambil data tanaman:", error);
            grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">Gagal memuat data. Pastikan server backend berjalan.</p>`;
        }
    }

    // --- FUNGSI UNTUK MEMBUKA MODAL ---
    async function openModal(id) {
        // Cari data dari `allTogaData` karena ID unik
        const tanaman = allTogaData.find(t => t.id === parseInt(id, 10));
        if (!tanaman) return;

        const imagePath = `/static/${tanaman.gambar}`;

        // Tampilkan informasi dasar & placeholder untuk resep
        modalBody.innerHTML = `
            <h2>${tanaman.nama}</h2>
            <p><i>${tanaman.namaLatin || ''}</i></p>
            <img src="${imagePath}" alt="${tanaman.nama}" class="modal-img">
            ${tanaman.deskripsiSingkat ? `<h4>Deskripsi Singkat</h4><p>${tanaman.deskripsiSingkat}</p>` : ''}
            ${tanaman.manfaat ? `<h4>Manfaat & Khasiat</h4><p style="white-space: pre-wrap;">${tanaman.manfaat}</p>` : ''}
            ${tanaman.caraPengolahan ? `<h4>Cara Pengolahan</h4><p style="white-space: pre-wrap;">${tanaman.caraPengolahan}</p>` : ''}
            ${allTogaData.length > 0 ? `
                <h4>Resep & Olahan Terkait</h4>
                <div id="resep-container"><p>Memuat resep...</p></div>
            ` : ''}
        `;
        modal.classList.add('active');

        // Ambil dan tampilkan resep
        try {
            // Perbaikan: Kita tidak lagi mengambil resep di sini
            // Sekarang, kita arahkan ke halaman detail tanaman untuk melihat resep lengkap

            // Cek apakah allTogaData sudah terisi (untuk mencegah error saat inisialisasi)
            if (allTogaData.length === 0) {
                return; // Skip pengambilan data jika belum siap
            }

            // Ambil resep dari allTogaData
            const resep_list = allTogaData.find(t => t.id === parseInt(id)).resep;

            // Jika tanaman tidak ditemukan atau allTogaData belum siap, keluar
            if (!resep_list) {
                return;
            }
            const resepContainer = document.getElementById('resep-container');

            if (resep_list.length > 0) {
                resepContainer.innerHTML = resep_list.map(resep => `
                    <div class="resep-item" data-resep-id="${resep.id}">
                        <button class="resep-btn">${resep.nama_resep}</button>
                        <div class="resep-detail" style="display: none;">
                            <strong>Bahan:</strong>
                            <p style="white-space: pre-wrap;">${resep.bahan}</p>
                            <strong>Langkah-langkah:</strong>
                            <p style="white-space: pre-wrap;">${resep.langkah_pembuatan}</p>
                        </div>
                    </div>
                `).join('');                
            } else {
                resepContainer.innerHTML = '<p>Belum ada resep untuk tanaman ini.</p>';
            }
            attachResepToggleListeners();
        } catch (error) {
            console.error("Error fetching recipes:", error);
            document.getElementById('resep-container').innerHTML = '<p>Gagal memuat data resep.</p>';
        }
    } 

    // --- EVENT LISTENERS ---
    
    function attachResepToggleListeners() {
        const resepItems = document.querySelectorAll('.resep-item');
        resepItems.forEach(item => {
            const button = item.querySelector('.resep-btn');
            const detail = item.querySelector('.resep-detail');

            button.addEventListener('click', () => {
                // Cek apakah detail saat ini sedang akan dibuka
                const isOpening = detail.style.display === 'none';

                // Selalu sembunyikan semua detail dan nonaktifkan semua tombol terlebih dahulu
                resepItems.forEach(otherItem => {
                    otherItem.querySelector('.resep-detail').style.display = 'none';
                    otherItem.querySelector('.resep-btn').classList.remove('active');
                });

                // Jika tujuannya adalah untuk membuka, maka tampilkan detail dan aktifkan tombolnya
                if (isOpening) {
                    detail.style.display = 'block';
                    button.classList.add('active');
                }
            });
        });
    }

    searchInput.addEventListener('input', () => {
        currentPage = 1; // Kembali ke halaman pertama setiap kali mencari
        updateDisplay();
    });

    sortAscBtn.addEventListener('click', () => {
        currentSortOrder = 'asc';
        sortAscBtn.classList.add('active');
        sortDescBtn.classList.remove('active');
        currentPage = 1;
        updateDisplay();
    });

    sortDescBtn.addEventListener('click', () => {
        currentSortOrder = 'desc';
        sortDescBtn.classList.add('active');
        sortAscBtn.classList.remove('active');
        currentPage = 1;
        updateDisplay();
    });

    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        updateDisplay();
    });

    // Klik pada kartu tanaman untuk membuka modal
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.toga-card');
        if (card) {
            openModal(card.dataset.id);
        }
    });

    // Menutup modal
    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // --- INISIALISASI ---
    // Panggil fungsi untuk mengambil data dari server saat halaman dimuat
    fetchTogaData();
});