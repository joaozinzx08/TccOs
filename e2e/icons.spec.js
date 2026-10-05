import { test, expect } from '@playwright/test';
import manifest from '../frontend/src/manifest.json' with { type: 'json' };
test('SVG em todas as telas, temas, conteúdo dinâmico e emojis do usuário preservados', async ({page,request}) => {
 test.setTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await request.post('/api/empresas',{data:{nome:'Empresa Ícones',responsavel:'Admin Ícones',email:'icons@example.com',senha:'Senha123!'}});
 expect(response.status()).toBe(201);const session=await response.json();
 await page.goto('/');
 await page.evaluate(s=>{localStorage.setItem('token',s.token);localStorage.setItem('usuario',JSON.stringify(s.usuario));localStorage.setItem('empresa',JSON.stringify(s.empresa));},session);
 for(const route of Object.keys(manifest).filter(r=>!/^\/(gestor|colaborador)\//.test(r))){
  await page.goto(route);
  await page.waitForFunction(()=>window.GestaoIcones && document.querySelector('svg.gestao-icone'));
  await expect.poll(()=>page.locator('body').innerText()).not.toContain('[[icone:');
  if(route==='/admin/dashboard.html'){
   await page.screenshot({path:'docs/evidencias/visual-azul-desktop.png',fullPage:true,animations:'disabled'});
   await page.click('#theme-toggle');
   await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
   await page.screenshot({path:'docs/evidencias/visual-azul-escuro.png',fullPage:true,animations:'disabled'});
   await page.click('#theme-toggle');
  }
 }
 await page.goto('/admin/chat.html');
 await page.getByText('Geral da Empresa',{exact:true}).first().click();
 await page.fill('#chat-input','Mensagem pessoal 😀');await page.click('#chat-send-btn');
 await expect(page.locator('#chat-messages')).toContainText('Mensagem pessoal 😀');
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.waitForFunction(()=>window.GestaoIcones);
 await page.screenshot({path:'docs/evidencias/visual-azul-mobile.png',fullPage:true,animations:'disabled'});
 expect(errors).toEqual([]);
});
