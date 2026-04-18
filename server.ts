import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UAParser } from 'ua-parser-js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderErrorPage(title: string, message: string) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | QRILCOUDE</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; }
            .bg-surface { background-color: #141414; }
            .text-accent { color: #6366f1; }
            .border-accent { border-color: #6366f1; }
        </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-surface border border-white/5 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-accent"></div>
            
            <div class="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
            </div>
            
            <h1 class="text-2xl font-bold mb-3 tracking-tight">${title}</h1>
            <p class="text-gray-400 text-sm leading-relaxed mb-8">
                ${message}
            </p>
            
            <div class="pt-6 border-t border-white/5">
                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">QRILCOUDE ENGINE</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Carregar config do Firebase
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Rota de Escaneamento Real
  app.get('/scan/:qrcodeId', async (req, res) => {
    const { qrcodeId } = req.params;
    console.log(`[SCAN] Processando QR ID: ${qrcodeId}`);
    
    // Garantir que a resposta seja interpretada como HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    try {
      const qrDoc = await getDoc(doc(db, 'qrcodes', qrcodeId));

      if (!qrDoc.exists()) {
        console.warn(`[SCAN] QR Code não encontrado: ${qrcodeId}`);
        // Usamos status 200 com a página de erro para evitar que o NGINX da infra substitua pelo erro padrão 404
        return res.send(renderErrorPage('QR Code não encontrado', 'Este código não existe em nossa base de dados ou foi removido.'));
      }

      const data = qrDoc.data();
      
      if (!data.active) {
        console.warn(`[SCAN] QR Code inativo: ${qrcodeId}`);
        // Usamos status 200 para garantir que nossa página estilizada seja exibida sem interferência do proxy
        return res.send(renderErrorPage('QR Code Inativo', 'Este QR Code não está disponível no momento. O proprietário desativou temporariamente este link.'));
      }

      console.log(`[SCAN] Redirecionando ${qrcodeId} para: ${data.config.data}`);

      // Detecção de Dispositivo e Localidade
      const ua = req.headers['user-agent'];
      const parser = new UAParser(ua);
      const device = parser.getDevice().type || 'desktop';
      const os = parser.getOS().name || 'unknown';
      
      // Localidade simplificada (em um ambiente real usaríamos um serviço de Geo-IP)
      // Aqui vamos pegar o idioma do header como proxy para região ou apenas marcar como detectado
      const lang = req.headers['accept-language']?.split(',')[0] || 'Unknown';

      // Logar o Scan no Firestore
      await addDoc(collection(db, 'qrcodes', qrcodeId, 'scans'), {
        timestamp: serverTimestamp(),
        device: device.charAt(0).toUpperCase() + device.slice(1),
        os: os,
        location: lang, // Ex: pt-BR, en-US
        userAgent: ua
      });

      // Redirecionar para o destino real
      let targetUrl = data.config.data;
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }
      res.redirect(targetUrl);
    } catch (error: any) {
      console.error('[SCAN] Erro ao processar scan:', error);
      
      if (error?.code === 'permission-denied') {
        return res.send(renderErrorPage('Acesso Restrito', 'Não foi possível validar as informações deste QR Code devido a restrições de segurança do banco de dados.'));
      }

      res.send(renderErrorPage('Erro Interno', 'Ocorreu uma falha inesperada ao processar seu acesso. Por favor, tente novamente mais tarde.'));
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Favicon fix
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
