// Preserve the original DOM, class names, styles, text and navigation. This is
// a mechanical conversion, not a redesign. Behaviour adapters live separately.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'frontend/legacy'),
  output = path.join(root, 'frontend/src/pages'),
  scripts = path.join(root, 'frontend/public/legacy-js');
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scripts, { recursive: true });
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory()
        ? walk(path.join(dir, d.name))
        : d.name.endsWith('.html')
          ? [path.join(dir, d.name)]
          : [],
    );
const attrMap = {
  enctype: 'encType',
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  novalidate: 'noValidate',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  srcset: 'srcSet',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  crossorigin: 'crossOrigin',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  viewbox: 'viewBox',
};
const bools = new Set([
  'disabled',
  'checked',
  'selected',
  'required',
  'multiple',
  'readonly',
  'autofocus',
  'novalidate',
  'hidden',
  'open',
  'controls',
  'autoplay',
  'loop',
  'muted',
]);
const events = {
  onclick: 'onClick',
  onchange: 'onChange',
  oninput: 'onInput',
  onsubmit: 'onSubmit',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  ondragover: 'onDragOver',
  ondrop: 'onDrop',
  ondragstart: 'onDragStart',
};
const q = JSON.stringify;
function style(value) {
  return Object.fromEntries(
    value
      .split(';')
      .map((s) => s.split(/:(.*)/s).slice(0, 2))
      .filter(([k, v]) => k?.trim() && v !== undefined)
      .map(([k, v]) => [
        k.trim().startsWith('--')
          ? k.trim()
          : k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
        v.trim(),
      ]),
  );
}
function render(node) {
  if (node.nodeName === '#text') {
    if (
      ['table', 'thead', 'tbody', 'tfoot', 'tr'].includes(node.parentNode?.tagName) &&
      !node.value.trim()
    )
      return null;
    return q(node.value);
  }
  if (!node.tagName || node.tagName === 'script') return null;
  const props = [];
  for (const a of node.attrs || []) {
    let name = attrMap[a.name] || a.name,
      value = a.value;
    if (events[a.name]) {
      props.push(
        `${q(events[a.name])}:function(event){${value.replace(/\bthis\b/g, 'event.currentTarget').replace(/return false\s*;?/g, 'event.preventDefault(); return false;')}}`,
      );
      continue;
    }
    if (a.name === 'disabled') {
      props.push('ref:element=>{if(element)element.disabled=true}');
      continue;
    }
    if (a.name === 'style') {
      props.push(`style:${q(style(value))}`);
      continue;
    }
    if (a.name === 'value' && ['input', 'textarea'].includes(node.tagName)) name = 'defaultValue';
    if (a.name === 'checked') name = 'defaultChecked';
    if (a.name === 'selected') continue;
    if (a.name === 'href' && value.startsWith('#')) {
    } // exact anchor retained
    props.push(`${q(name)}:${bools.has(a.name) ? 'true' : q(value)}`);
  }
  if (node.tagName === 'textarea') {
    props.push(`defaultValue:${q((node.childNodes || []).map((n) => n.value || '').join(''))}`);
    return `h('textarea',{${props.join(',')}})`;
  }
  if (node.tagName === 'select') {
    const selected = (node.childNodes || []).find(
      (n) => n.tagName === 'option' && n.attrs?.some((a) => a.name === 'selected'),
    );
    if (selected)
      props.push(
        'defaultValue:' +
          q(
            selected.attrs.find((a) => a.name === 'value')?.value ||
              selected.childNodes?.[0]?.value ||
              '',
          ),
      );
  }
  const children = (node.childNodes || []).map(render).filter((n) => n !== null);
  return `h(${q(node.tagName)},{${props.join(',')}}${children.length ? ',' + children.join(',') : ''})`;
}
const manifest = {};
for (const file of walk(source)) {
  const html = fs.readFileSync(file, 'utf8'),
    doc = parse(html),
    relative = path.relative(source, file).replaceAll('\\', '/'),
    key = relative.replace(/\.html$/, '').replaceAll('/', '__');
  const htmlNode = doc.childNodes.find((n) => n.tagName === 'html'),
    head = htmlNode.childNodes.find((n) => n.tagName === 'head'),
    body = htmlNode.childNodes.find((n) => n.tagName === 'body');
  const title =
    head.childNodes.find((n) => n.tagName === 'title')?.childNodes?.[0]?.value || 'Gestão OS';
  const styles = head.childNodes
    .filter((n) => n.tagName === 'style')
    .map((n) => n.childNodes.map((c) => c.value || '').join(''));
  const code = [];
  function collect(n) {
    if (n.tagName === 'script' && !n.attrs.some((a) => a.name === 'src'))
      code.push((n.childNodes || []).map((c) => c.value || '').join(''));
    for (const child of n.childNodes || []) collect(child);
  }
  collect(doc);
  let js = code
    .join('\n')
    .replaceAll('http://localhost:3000/api', '/api')
    .replaceAll("document.addEventListener('DOMContentLoaded',", 'window.onLegacyReady(')
    .replaceAll('document.addEventListener("DOMContentLoaded",', 'window.onLegacyReady(');
  js = js.replaceAll('localStorage.clear();', 'clearSession();');
  // Data requests all go through the same authenticated React API client.
  js = js.replace(/fetch\(/g, 'window.legacyFetch(');
  // Escape plain text at HTML interpolation points in original templates.
  js = js.replace(
    /\$\{([\w.]+\.(?:nome|titulo|descricao|email|resumo|categoria|detalhes|usuarioNome|autorNome))\}/g,
    '${window.escapeHTML($1)}',
  );
  js = js.replace(
    /\+ ([\w.]+\.(?:nome|titulo|descricao|email|resumo|categoria|detalhes|usuarioNome|autorNome)) \+/g,
    '+ window.escapeHTML($1) +',
  );
  const exported = [
    ...new Set([...js.matchAll(/^ {0,8}(?:async )?function (\w+)\(/gm)].map((m) => m[1])),
  ];
  js = '(function(){\n' + js + '\nObject.assign(window,{' + exported.map(name => `...(typeof ${name} === 'function' ? {${name}} : {})`).join(',') + '});\n})();';
  fs.writeFileSync(path.join(scripts, key + '.js'), js);
  const component = `import React from 'react';\nconst h=React.createElement;\nexport const metadata=${q({ title, bodyClass: body.attrs.find((a) => a.name === 'class')?.value || '', styles, script: '/legacy-js/' + key + '.js', key: relative })};\nexport default function OriginalPage(){return h(React.Fragment,null,${body.childNodes
    .map(render)
    .filter((n) => n !== null)
    .join(',')});}\n`;
  fs.writeFileSync(path.join(output, key + '.jsx'), component);
  manifest['/' + relative] = {
    file: key,
    protected: /^(admin|gestor|colaborador)\//.test(relative),
  };
}
fs.writeFileSync(path.join(root, 'frontend/src/manifest.json'), q(manifest));
console.log(`Convertidas ${Object.keys(manifest).length} telas originais em componentes React.`);
