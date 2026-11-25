/* ==========================================================================
   Minimal & Modern Chocolate Brand — Shared Frontend Logic (script.js)
   Handles: product.html, order.html, admin.html
   ========================================================================== */

const CONFIG = {
  PRODUCTS_URL: 'products.json',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxHdP4m4eouropsLHs-c3KntchLVid9Y15h-QJjzxKJMiNHjy6LGzctXEXBUWKMVtfQ/exec',
  ADMIN_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJVnv53a__7CeADW_Mvmk-VeKGnk-T9JAlFKDkJn9lvjbkSutTI-Ec-kjMWr9wuOagUn92yQMIqVLq/pub?gid=0&single=true&output=csv'
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. ตรวจสอบและทำงานเฉพาะหน้า product.html
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  // 2. ตรวจสอบและทำงานเฉพาะหน้า order.html
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. ตรวจสอบและทำงานเฉพาะหน้า admin.html
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* ==========================================================================
   1. PRODUCT PAGE (product.html)
   ========================================================================== */
async function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const productList = document.getElementById('product-list');

  let allProducts = [];

  // อ่านค่า ?mood=xxx จาก URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = (urlParams.get('mood') || 'all').toLowerCase();

  try {
    const response = await fetch(CONFIG.PRODUCTS_URL);
    if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ products.json ได้');
    allProducts = await response.json();

    renderFilterButtons(filterBar, allProducts, initialMood, (selectedMood) => {
      updateMoodQueryParam(selectedMood);
      renderProducts(productList, allProducts, selectedMood);
    });

    renderProducts(productList, allProducts, initialMood);
  } catch (error) {
    console.error('Error loading products:', error);
    productList.innerHTML = `<p class="text-muted">ขออภัย ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้</p>`;
  }
}

function renderFilterButtons(container, products, activeMood, onSelect) {
  if (!container) return;

  const moods = [
    { key: 'all', label: 'All Moods' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  container.innerHTML = moods
    .map((m) => {
      const isActive = m.key === activeMood;
      const dotHtml = m.key !== 'all' ? `<span class="mood-dot mood-dot--${m.key}"></span>` : '';
      return `
        <button
          type="button"
          class="btn ${isActive ? 'btn--accent' : ''}"
          data-mood="${m.key}"
          aria-pressed="${isActive}"
        >
          ${dotHtml}
          <span>${m.label}</span>
        </button>
      `;
    })
    .join('');

  container.querySelectorAll('button[data-mood]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosenMood = btn.getAttribute('data-mood');

      // อัปเดตสถานะปุ่มที่ถูกเลือก
      container.querySelectorAll('button[data-mood]').forEach((b) => {
        const active = b.getAttribute('data-mood') === chosenMood;
        b.classList.toggle('btn--accent', active);
        b.setAttribute('aria-pressed', String(active));
      });

      onSelect(chosenMood);
    });
  });
}

function renderProducts(container, products, moodFilter) {
  if (!container) return;

  const filtered =
    !moodFilter || moodFilter === 'all'
      ? products
      : products.filter((p) => String(p.mood || '').toLowerCase() === moodFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted">ไม่พบรายการสินค้าในหมวดหมู่นี้</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((product) => {
      const moodKey = String(product.mood || '').toLowerCase();
      const formattedPrice = Number(product.price).toLocaleString('th-TH');
      const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;

      return `
        <article class="card">
          <div class="card__media">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
          </div>
          <div class="mood-indicator">
            <span class="mood-dot mood-dot--${escapeHtml(moodKey)}"></span>
            <span>${escapeHtml(product.mood)}</span>
          </div>
          <h3 class="card-title heading-accent-line heading-accent-line--${escapeHtml(moodKey)}">
            ${escapeHtml(product.name)}
          </h3>
          <p class="text-muted">ขนาด ${escapeHtml(product.size)}</p>
          ${product.description ? `<p class="text-muted">${escapeHtml(product.description)}</p>` : ''}
          <div class="card__price">฿${formattedPrice}</div>
          <a href="${orderUrl}" class="btn btn--solid-subtle">สั่งซื้อ</a>
        </article>
      `;
    })
    .join('');
}

function updateMoodQueryParam(mood) {
  const url = new URL(window.location.href);
  if (!mood || mood === 'all') {
    url.searchParams.delete('mood');
  } else {
    url.searchParams.set('mood', mood);
  }
  window.history.replaceState({}, '', url.toString());
}

/* ==========================================================================
   2. ORDER PAGE (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // อ่านค่า item และ price จาก URL parameter แล้วเติมลงช่องทันที
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  if (itemsInput && itemParam !== null) {
    itemsInput.value = itemParam;
  }

  if (totalInput && priceParam !== null) {
    totalInput.value = priceParam;
  }

  // จัดการการกดยืนยันสั่งซื้อ (ล็อกสเปกตาม Apps Script ห้ามตั้ง headers และห้ามใช้ mode: 'no-cors')
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch((error) => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      });
  });
}

/* ==========================================================================
   3. ADMIN PAGE (admin.html)
   ========================================================================== */
async function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted">กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>`;

  try {
    // เติม timestamp กัน cache เพื่อให้ได้ข้อมูลล่าสุดจาก Google Sheets เสมอ
    const cacheBuster = `&_t=${Date.now()}`;
    const response = await fetch(CONFIG.ADMIN_CSV_URL + cacheBuster);
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูล CSV ได้');

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length <= 1) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-muted">ยังไม่มีรายการสั่งซื้อ</td></tr>`;
      return;
    }

    // ตัดแถวหัวตาราง (index 0) และกรองแถวว่างออก จากนั้นเรียงรายการล่าสุดขึ้นก่อน
    const dataRows = rows
      .slice(1)
      .filter((row) => row.some((cell) => cell.trim() !== ''))
      .reverse();

    tbody.innerHTML = dataRows
      .map((row) => {
        // คาดหวังคอลัมน์: [0] วันเวลา, [1] ชื่อลูกค้า, [2] เบอร์โทร/Line, [3] รายการสินค้า, [4] จำนวนเงินรวม, [5] หมายเหตุ
        const timestamp = row[0] || '-';
        const customerName = row[1] || '-';
        const contact = row[2] || '-';
        const items = row[3] || '-';
        const totalRaw = row[4] || '-';
        const note = row[5] || '-';

        const totalFormatted =
          !isNaN(Number(totalRaw)) && totalRaw.trim() !== ''
            ? `฿${Number(totalRaw).toLocaleString('th-TH')}`
            : totalRaw;

        return `
          <tr>
            <td>${escapeHtml(timestamp)}</td>
            <td>${escapeHtml(customerName)}</td>
            <td>${escapeHtml(contact)}</td>
            <td>${escapeHtml(items)}</td>
            <td>${escapeHtml(totalFormatted)}</td>
            <td>${escapeHtml(note)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading admin CSV:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>`;
  }
}

/**
 * ฟังก์ชัน Parse CSV แบบเขียนเอง (รองรับเครื่องหมายอัญประกาศ "...", คอมม่าในข้อความ, และการขึ้นบรรทัดใหม่ในเซลล์)
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  // แปลง \r\n ให้เป็น \n เพื่อความสม่ำเสมอ
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // เครื่องหมาย "" ภายในฟิลด์ที่ครอบด้วย " หมายถึงตัวอักษร " หนึ่งตัว
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // เก็บเซลล์และแถวสุดท้ายหากไม่มี \n ปิดท้ายไฟล์
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/* ==========================================================================
   UTILITY: ป้องกัน XSS เวลาแสดงผลข้อความจาก URL / CSV
   ========================================================================== */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}