import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const pages = ['termos.html', 'privacidade.html', 'cookies.html'];

test('páginas legais públicas têm conteúdo, idioma e caminhos de navegação', () => {
  for (const name of pages) {
    const html = read('frontend/public/' + name);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /<main\b[^>]*id="conteudo"/);
    assert.match(html, /Versão inicial 1\.0/);
    assert.match(html, /mailto:joaogabrielzx884@gmail\.com/);
    assert.ok(html.length > 1500);
  }
});
test('cadastro aponta para documentos reais, sem modal fictício', () => {
  const legacy = read('frontend/legacy/criar-empresa.html');
  const generated = read('frontend/src/pages/criar-empresa.jsx');
  for (const html of [legacy, generated]) {
    assert.match(html, /termos\.html/);
    assert.match(html, /privacidade\.html/);
    assert.doesNotMatch(html, /Termos de Uso em desenvolvimento|Política de Privacidade em desenvolvimento/);
  }
});
test('links jurídicos não são placeholders no rodapé da página inicial', () => {
  for (const name of ['index', 'contato']) {
    const legacy = read('frontend/legacy/' + name + '.html');
    const generated = read('frontend/src/pages/' + name + '.jsx');
    for (const html of [legacy, generated]) {
      assert.match(html, /termos\.html/);
      assert.match(html, /privacidade\.html/);
      assert.match(html, /cookies\.html/);
    }
  }
});
