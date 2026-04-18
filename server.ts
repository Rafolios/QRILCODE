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

    try {
      const qrDoc = await getDoc(doc(db, 'qrcodes', qrcodeId));

      if (!qrDoc.exists()) {
        return res.status(404).send('QR Code não encontrado.');
      }

      const data = qrDoc.data();
      
      if (!data.active) {
        return res.status(403).send('Este QR Code está inativo no momento.');
      }

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
      res.redirect(data.config.data);
    } catch (error) {
      console.error('Erro ao processar scan:', error);
      res.status(500).send('Erro interno ao processar o QR Code.');
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

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
