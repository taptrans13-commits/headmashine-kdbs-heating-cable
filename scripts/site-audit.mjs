import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const htmlFiles = readdirSync(root).filter((file) => extname(file) === ".html").sort();
const errors = [];
const canonicalOwners = new Map();
const mainPages = new Set([
  "index.html", "catalog.html", "calculator.html", "application.html",
  "delivery.html", "documents.html", "faq.html", "contacts.html"
]);

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function checkLocalTarget(page, rawTarget) {
  if (!rawTarget || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(rawTarget)) return;
  const clean = decodeURIComponent(rawTarget.split("#")[0].split("?")[0]);
  if (!clean) return;
  const target = join(root, clean);
  if (!existsSync(target)) errors.push(`${page}: отсутствует локальный ресурс ${rawTarget}`);
}

for (const page of htmlFiles) {
  const html = readFileSync(join(root, page), "utf8");

  if (count(html, /<title\b/gi) !== 1) errors.push(`${page}: нужен ровно один title`);
  if (count(html, /<h1\b/gi) !== 1) errors.push(`${page}: нужен ровно один h1`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) errors.push(`${page}: нет viewport`);

  if (mainPages.has(page)) {
    if (!/<meta\s+name=["']description["']/i.test(html)) errors.push(`${page}: нет description`);
    if (!/<meta\s+name=["']robots["'][^>]*index/i.test(html)) errors.push(`${page}: страница не разрешена к индексации`);
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
    if (!canonical) {
      errors.push(`${page}: нет canonical`);
    } else if (canonicalOwners.has(canonical)) {
      errors.push(`${page}: canonical совпадает с ${canonicalOwners.get(canonical)}`);
    } else {
      canonicalOwners.set(canonical, page);
    }
  }

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const id of new Set(ids)) {
    if (ids.filter((value) => value === id).length > 1) errors.push(`${page}: повторяется id=${id}`);
  }

  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    checkLocalTarget(page, match[1]);
  }

  for (const match of html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    if (!/rel=["'][^"']*noopener/i.test(match[0])) errors.push(`${page}: target=_blank без rel=noopener`);
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${page}: некорректный JSON-LD (${error.message})`);
    }
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const page of mainPages) {
  const canonical = [...canonicalOwners.entries()].find(([, owner]) => owner === page)?.[0];
  if (canonical && !sitemap.includes(`<loc>${canonical}</loc>`)) errors.push(`sitemap.xml: нет ${canonical}`);
}

const app = readFileSync(join(root, "app.js"), "utf8");
if (!/requestForm\.addEventListener\(["']submit["']/.test(app)) errors.push("app.js: форма заявки не обрабатывает submit");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Site audit passed: ${htmlFiles.length} HTML pages, ${canonicalOwners.size} canonical URLs.`);
