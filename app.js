const products = [
  { name: "КДБС-40, 3 м", length: 3, price: 2035, stock: "под заказ", set: "кабель + вилка" },
  { name: "КДБС-40, 5 м", length: 5, price: 2235, stock: "в наличии", stockQty: 23, set: "кабель + вилка" },
  { name: "КДБС-40, 10 м", length: 10, price: 2725, stock: "в наличии", stockQty: 15, set: "кабель + вилка" },
  { name: "КДБС-40, 20 м", length: 20, price: 3500, stock: "в наличии", stockQty: 26, set: "кабель + вилка" },
  { name: "КДБС-40, 35 м", length: 35, price: 5440, stock: "в наличии", stockQty: 35, set: "кабель + вилка" },
  { name: "КДБС-40, 53 м", length: 53, price: 7250, stock: "в наличии", stockQty: 17, set: "кабель + вилка" },
  { name: "КДБС-40, 78 м", length: 78, price: 9255, stock: "в наличии", stockQty: 55, set: "кабель + вилка" },
  { name: "КДБС-40, 97 м", length: 97, price: 11800, stock: "в наличии", stockQty: 29, set: "кабель без вилки" },
  { name: "КДБС-40, 145 м", length: 145, price: 23460, stock: "в наличии", stockQty: 35, set: "кабель без вилки" }
];

const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1
});

const state = {
  mode: "area"
};

const els = {
  productGrid: document.querySelector("#productGrid"),
  productRows: document.querySelector("#productRows"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  areaPanel: document.querySelector('[data-panel="area"]'),
  lengthPanel: document.querySelector('[data-panel="length"]'),
  areaInput: document.querySelector("#areaInput"),
  stepInput: document.querySelector("#stepInput"),
  reserveInput: document.querySelector("#reserveInput"),
  lengthInput: document.querySelector("#lengthInput"),
  stepValue: document.querySelector("#stepValue"),
  requiredLength: document.querySelector("#requiredLength"),
  selectedLength: document.querySelector("#selectedLength"),
  totalPower: document.querySelector("#totalPower"),
  totalPrice: document.querySelector("#totalPrice"),
  kitList: document.querySelector("#kitList"),
  quoteLink: document.querySelector("#quoteLink"),
  whatsappLink: document.querySelector("#whatsappLink")
};

function renderCatalog() {
  const featured = products.filter((item) => [20, 35, 53, 78, 145].includes(item.length));

  els.productGrid.innerHTML = featured.map((item) => `
    <article class="product-card reveal">
      <img src="assets/kdbs-card-main.jpg" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <p class="price">${rub.format(item.price)}</p>
      </div>
      <div class="meta">
        <span class="pill ${item.stock === "в наличии" ? "stock" : "order"}">${stockLabel(item)}</span>
        <span class="pill">${item.set}</span>
      </div>
    </article>
  `).join("");

  els.productRows.innerHTML = products.map((item) => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.length} м</td>
      <td>${item.set}</td>
      <td>${stockLabel(item)}</td>
      <td><strong>${rub.format(item.price)}</strong></td>
    </tr>
  `).join("");
}

function stockLabel(item) {
  if (item.stockQty) {
    return `${item.stock}: ${item.stockQty} шт.`;
  }
  return item.stock;
}

function getTargetLength() {
  if (state.mode === "length") {
    return clamp(Number(els.lengthInput.value), 1, 2000);
  }

  const area = clamp(Number(els.areaInput.value), 1, 1000);
  const stepMeters = clamp(Number(els.stepInput.value), 7, 30) / 100;
  const reserve = clamp(Number(els.reserveInput.value), 0, 30) / 100;
  return (area / stepMeters) * (1 + reserve);
}

function solveKit(targetLength) {
  const target = Math.ceil(targetLength);
  const maxLength = target + 160;
  const dp = Array.from({ length: maxLength + 1 }, () => null);
  dp[0] = { price: 0, count: 0, items: [] };

  for (let length = 0; length <= maxLength; length += 1) {
    if (!dp[length]) continue;
    for (const product of products) {
      const nextLength = length + product.length;
      if (nextLength > maxLength) continue;
      const next = {
        price: dp[length].price + product.price,
        count: dp[length].count + 1,
        items: dp[length].items.concat(product)
      };
      if (!dp[nextLength] || isBetter(next, dp[nextLength])) {
        dp[nextLength] = next;
      }
    }
  }

  let best = null;
  for (let length = target; length <= maxLength; length += 1) {
    if (!dp[length]) continue;
    const candidate = { ...dp[length], length };
    if (!best || compareCandidate(candidate, best, target) < 0) {
      best = candidate;
    }
  }

  return best || { price: 0, count: 0, length: 0, items: [] };
}

function isBetter(a, b) {
  if (a.count !== b.count) return a.count < b.count;
  return a.price < b.price;
}

function compareCandidate(a, b, target) {
  const overA = a.length - target;
  const overB = b.length - target;
  if (overA !== overB) return overA - overB;
  if (a.count !== b.count) return a.count - b.count;
  return a.price - b.price;
}

function groupKit(items) {
  return items.reduce((acc, item) => {
    const key = item.name;
    if (!acc[key]) {
      acc[key] = { ...item, quantity: 0 };
    }
    acc[key].quantity += 1;
    return acc;
  }, {});
}

function updateCalculator() {
  els.stepValue.textContent = `${els.stepInput.value} см`;

  const targetLength = getTargetLength();
  const kit = solveKit(targetLength);
  const groups = Object.values(groupKit(kit.items));
  const powerKw = kit.length * 40 / 1000;
  const currentA = powerKw * 1000 / 220;

  els.requiredLength.textContent = `${number.format(targetLength)} м`;
  els.selectedLength.textContent = `${number.format(kit.length)} м`;
  els.totalPower.textContent = `${number.format(powerKw)} кВт`;
  els.totalPrice.textContent = rub.format(kit.price);

  els.kitList.innerHTML = groups.map((item) => `
    <div class="kit-row">
      <div>
        <strong>${item.name} x ${item.quantity}</strong>
        <span>${item.set}, ${stockLabel(item)}</span>
      </div>
      <em>${rub.format(item.price * item.quantity)}</em>
    </div>
  `).join("");

  const lines = groups.map((item) => `${item.name} x ${item.quantity}`).join(", ");
  const body = [
    "Здравствуйте.",
    "Нужно КП на КДБС.",
    `Расчетная длина: ${number.format(targetLength)} м`,
    `Подобрано: ${number.format(kit.length)} м`,
    `Ориентировочная мощность: ${number.format(powerKw)} кВт`,
    `Ориентировочный ток при 220 В: ${number.format(currentA)} А`,
    `Комплектация: ${lines}`,
    `Ориентир по цене: ${rub.format(kit.price)}`
  ].join("\n");

  els.quoteLink.href = `mailto:info@power-cab.ru?subject=${encodeURIComponent("КП на КДБС")}&body=${encodeURIComponent(body)}`;
  els.whatsappLink.href = `https://wa.me/79922121369?text=${encodeURIComponent(body)}`;
}

function setMode(mode) {
  state.mode = mode;
  els.modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });
  els.areaPanel.classList.toggle("hidden", mode !== "area");
  els.lengthPanel.classList.toggle("hidden", mode !== "length");
  updateCalculator();
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach((item) => observer.observe(item));
}

renderCatalog();
updateCalculator();
setupReveal();

els.modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

[els.areaInput, els.stepInput, els.reserveInput, els.lengthInput].forEach((input) => {
  input.addEventListener("input", updateCalculator);
});
