# QRILCOUDE 🔳✨

> **Plataforma Avançada de QR Codes Dinâmicos e Inteligentes**

Desenvolvido por **Rafael Rocha Tavares**, o QRILCOUDE é uma solução full-stack moderna para criação, gestão e monitoramento de QR Codes profissionais. Diferente de geradores estáticos, esta plataforma oferece inteligência de dados e flexibilidade total após a impressão.

---

## 🚀 O que é o QRILCOUDE?

O QRILCOUDE transforma QR Codes simples em ferramentas de marketing poderosas. Através de uma arquitetura baseada em redirecionamento dinâmico, você pode atualizar o destino do seu código a qualquer momento, monitorar quem escaneou, de onde vieram e qual dispositivo usaram — tudo em tempo real através de um painel elegante e intuitivo.

## 🛠️ Funcionalidades Principais

- 📱 **QR Codes Dinâmicos**: Altere a URL de destino sem precisar gerar um novo código ou re-imprimir materiais.
- 📊 **Monitoramento em Tempo Real (Analytics)**: Rastreie scans, detecte dispositivos (Mobile/Desktop/Tablet), sistemas operacionais e localidades.
- 🎨 **Customização Extrema**: Controle total sobre cores, gradientes, formatos de pontos, cantos e inserção de logotipos personalizados.
- 📁 **Gestão de Projetos**: Salve, renomeie, duplique e organize múltiplos projetos na nuvem com Firebase.
- ☁️ **Sincronização Cloud**: Login via Google para acesso seguro aos seus projetos de qualquer lugar.
- 📥 **Exportação Multiformato**: Gere arquivos em alta definição (PNG, JPEG, SVG) ou documentos PDF prontos para impressão.
- 🔒 **Páginas de Erro Inteligentes**: Tratamento profissional para códigos inativos ou não encontrados com design dark moderno.

## 🏗️ Organização do Projeto

A estrutura foi pensada para escalabilidade e separação clara de responsabilidades:

```text
├── src/
│   ├── components/       # Componentes React reutilizáveis e UI
│   ├── lib/              # Utilidades, ajuda e config do Firebase
│   ├── types/            # Definições de tipos TypeScript
│   ├── App.tsx           # Ponto de entrada do Frontend e lógica de estado
│   └── index.css         # Estilização global via Tailwind CSS 4.0
├── server.ts             # Servidor Backend (Express) para rastreio e redirecionamento
├── firestore.rules       # Regras de segurança robustas do banco de dados
├── firebase-applet-config.json # Configurações da infraestrutura Cloud
├── package.json          # Orquestração de dependências e scripts
└── tsconfig.json         # Configurações do compilador TypeScript
```

## 💻 Tecnologias & Bibliotecas

### Core Stack
- **Framework**: [React 19](https://react.dev/) com **TypeScript**
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Backend/API**: [Express](https://expressjs.com/) & [tsx](https://github.com/esbuild-kit/tsx)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Authentication)

### Bibliotecas Externas
- **QR Generation**: `qr-code-styling`
- **Animações**: `motion` (Framer Motion)
- **Analytics Charts**: `recharts`
- **Ícones**: `lucide-react`
- **User Agent Parsing**: `ua-parser-js`
- **Exportação de PDF**: `jspdf`

## ⚙️ Como Usar o Repositório

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)

### Instalação e Execução

1. Clone o repositório para sua máquina local.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento (Full-Stack Mode):
   ```bash
   npm run dev
   ```
4. Otimize e gere o build de produção:
   ```bash
   npm run build
   ```

---

## 👤 Autor

**Rafael Rocha Tavares**  
*Desenvolvedor e Idealizador do QRILCOUDE*

---

> Esse projeto foi construído com foco em **Performance**, **Design Intuitivo** e **Segurança de Dados**.
