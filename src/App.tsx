import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, Trash2, QrCode, Palette, Image as ImageIcon, Box, LogIn, LogOut, Save, FolderOpen, Plus, Copy, Power, PowerOff, Edit3, BarChart3, ChevronLeft, MapPin, Tablet, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { QRCodeRenderer, QRCodeRendererHandle } from './components/QRCodeRenderer';
import { ControlSection, Label, Input, Select } from './components/Controls';
import { DEFAULT_CONFIG, QRConfig, DotType, CornerSquareType, CornerDotType, FileExtension } from './types';
import { cn } from './lib/utils';
import { auth, loginWithGoogle, logout, db, SavedQRCode, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp, getDocs, limit } from 'firebase/firestore';

export default function App() {
  const [config, setConfig] = useState<QRConfig>(DEFAULT_CONFIG);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<SavedQRCode[]>([]);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Novo QR Code');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingAnalytics, setViewingAnalytics] = useState<SavedQRCode | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  const rendererRef = useRef<QRCodeRendererHandle>(null);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProjects([]);
        setIsProjectsOpen(false);
      }
    });
  }, []);

  // Projects Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'qrcodes'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedQRCode));
      setProjects(docs);
    });
  }, [user]);

  const saveProject = async () => {
    if (!user) {
      alert('Faça login para salvar seus QR Codes');
      return;
    }

    try {
      if (currentProjectId) {
        await updateDoc(doc(db, 'qrcodes', currentProjectId), {
          name: projectName,
          config: config,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'qrcodes'), {
          name: projectName,
          config: config,
          active: true,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCurrentProjectId(docRef.id);
      }
      alert('Projeto salvo com sucesso!');
    } catch (error) {
      handleFirestoreError(error, currentProjectId ? 'update' : 'create', 'qrcodes');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'qrcodes', id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setConfig(DEFAULT_CONFIG);
        setProjectName('Novo QR Code');
      }
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, 'delete', `qrcodes/${id}`);
    }
  };

  const toggleProjectStatus = async (project: SavedQRCode) => {
    try {
      await updateDoc(doc(db, 'qrcodes', project.id), {
        active: !project.active,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `qrcodes/${project.id}`);
    }
  };

  const duplicateProject = async (project: SavedQRCode) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'qrcodes'), {
        name: `${project.name} (Cópia)`,
        config: project.config,
        active: true,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'qrcodes');
    }
  };

  const loadProject = (project: SavedQRCode) => {
    setConfig(project.config);
    setProjectName(project.name);
    setCurrentProjectId(project.id);
    setIsProjectsOpen(false);
  };

  const renameProject = async (id: string) => {
    if (!renamingValue.trim()) return;
    try {
      await updateDoc(doc(db, 'qrcodes', id), {
        name: renamingValue.trim(),
        updatedAt: serverTimestamp()
      });
      if (currentProjectId === id) setProjectName(renamingValue.trim());
      setRenamingId(null);
      setRenamingValue('');
    } catch (error) {
      handleFirestoreError(error, 'update', `qrcodes/${id}`);
    }
  };

  const loadAnalytics = async (project: SavedQRCode) => {
    setViewingAnalytics(project);
    try {
      const scansRef = collection(db, 'qrcodes', project.id, 'scans');
      const q = query(scansRef, orderBy('timestamp', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      
      const rawScans = querySnapshot.docs.map(doc => doc.data());
      
      // Processar dados para o gráfico (últimos 7 dias)
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { 
          name: days[d.getDay()], 
          fullDate: d.toLocaleDateString(),
          scans: 0,
          rawDate: d.toDateString()
        };
      }).reverse();

      rawScans.forEach(scan => {
        if (!scan.timestamp) return;
        const scanDate = scan.timestamp.toDate().toDateString();
        const dayMatch = last7Days.find(d => d.rawDate === scanDate);
        if (dayMatch) dayMatch.scans++;
      });

      setAnalyticsData(last7Days);

      // Processar dispositivos
      const devices = rawScans.reduce((acc: any, scan: any) => {
        const d = scan.device?.toLowerCase() || 'desktop';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});
      
      const total = rawScans.length || 1;
      const deviceStats = [
        { label: 'Mobile', icon: Smartphone, value: rawScans.length ? `${Math.round((devices.mobile || 0) / total * 100)}%` : '0%', count: devices.mobile || 0 },
        { label: 'Desktop', icon: Monitor, value: rawScans.length ? `${Math.round((devices.desktop || 0) / total * 100)}%` : '0%', count: devices.desktop || 0 },
        { label: 'Tablet', icon: Tablet, value: rawScans.length ? `${Math.round((devices.tablet || 0) / total * 100)}%` : '0%', count: devices.tablet || 0 },
      ];
      (window as any)._deviceStats = deviceStats;

      // Processar localidade
      const locations = rawScans.reduce((acc: any, scan: any) => {
        const loc = scan.location || 'Desconhecido';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {});
      
      const locationStats = Object.entries(locations).map(([label, visits]) => ({ label, visits: visits as number }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);
      
      (window as any)._locationStats = locationStats.length ? locationStats : [{ label: 'Nenhum acesso', visits: 0 }];

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      setAnalyticsData(Array.from({length: 7}, (_, i) => ({ name: '', scans: 0 })));
    }
  };

  const createNew = () => {
    setConfig(DEFAULT_CONFIG);
    setProjectName('Novo QR Code');
    setCurrentProjectId(null);
  };

  const updateConfig = useCallback((path: string, value: any) => {
    if (path === 'data') {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (value && !urlPattern.test(value)) {
        setUrlError('Por favor, insira uma URL válida (ex: https://exemplo.com)');
      } else {
        setUrlError(null);
      }
    }
    
    setConfig((prev) => {
      const newConfig = { ...prev };
      const parts = path.split('.');
      let current: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newConfig;
    });
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateConfig('image', event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      delete newConfig.image;
      return newConfig;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden font-sans selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <QrCode size={18} />
          </div>
          <h1 className="font-bold tracking-tight text-lg text-text-main">QRILCOUDE</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-text-dim font-bold uppercase tracking-wider">Usuário</span>
                <span className="text-xs text-text-main font-medium">{user.displayName}</span>
              </div>
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-border" alt="Profile" />
              <button onClick={logout} className="p-2 hover:bg-surface-light text-text-dim hover:text-red-500 transition-colors rounded">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold bg-white text-black hover:bg-white/90 transition-all shadow-lg shadow-white/10"
            >
              <LogIn size={14} />
              ENTRAR COM GOOGLE
            </button>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsProjectsOpen(true)}
              className="px-4 py-2 rounded-md text-xs font-medium border border-border hover:bg-surface-light transition-colors flex items-center gap-2"
            >
              <FolderOpen size={14} />
              MEUS PROJETOS
            </button>
            <button 
              onClick={saveProject}
              className="px-4 py-2 rounded-md text-xs font-medium bg-accent hover:bg-accent-hover text-white transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
            >
              <Save size={14} />
              SALVAR
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar Controls */}
        <aside className="w-[340px] border-r border-border flex flex-col bg-surface overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-border bg-bg/50">
            <Label>Nome do Projeto</Label>
            <Input 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Cartão de Visitas"
            />
          </div>
          <ControlSection title="Configuração Principal" defaultOpen={true}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="mb-0">Dados / URL</Label>
                {urlError && <span className="text-[10px] text-red-500 font-bold animate-pulse">{urlError}</span>}
              </div>
              <Input 
                value={config.data} 
                onChange={(e) => updateConfig('data', e.target.value)}
                placeholder="https://google.com"
                className={cn(urlError ? "border-red-500/50 focus:border-red-500" : "")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Largura (px)</Label>
                <Input 
                  type="number"
                  value={config.width}
                  onChange={(e) => updateConfig('width', Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Margem (px)</Label>
                <Input 
                  type="number"
                  value={config.margin}
                  onChange={(e) => updateConfig('margin', Number(e.target.value))}
                />
              </div>
            </div>
          </ControlSection>

          <ControlSection title="Estilo dos Pontos">
            <div>
              <Label>Tipo</Label>
              <Select 
                value={config.dotsOptions.type}
                onChange={(e) => updateConfig('dotsOptions.type', e.target.value as DotType)}
                options={[
                  { label: 'Quadrado', value: 'square' },
                  { label: 'Pontos', value: 'dots' },
                  { label: 'Arredondado', value: 'rounded' },
                  { label: 'Extra Arredondado', value: 'extra-rounded' },
                  { label: 'Elegante', value: 'classy' },
                  { label: 'Elegante Arredondado', value: 'classy-rounded' },
                ]}
              />
            </div>
            <div>
              <Label>Cor / Gradiente</Label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="color" 
                  value={config.dotsOptions.color}
                  onChange={(e) => updateConfig('dotsOptions.color', e.target.value)}
                  className="w-10 h-10 p-1 bg-surface border border-border cursor-pointer rounded"
                />
                <Input 
                  value={config.dotsOptions.color}
                  onChange={(e) => updateConfig('dotsOptions.color', e.target.value)}
                  className="flex-1"
                />
              </div>
              
              <div className="p-3 border border-border rounded-lg space-y-3 bg-bg">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[11px] font-bold text-text-dim">HABILITAR GRADIENTE</span>
                  <input 
                    type="checkbox"
                    checked={!!config.dotsOptions.gradient}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig('dotsOptions.gradient', {
                          type: 'linear',
                          rotation: 0,
                          colorStops: [
                            { offset: 0, color: config.dotsOptions.color },
                            { offset: 1, color: '#000000' }
                          ]
                        });
                      } else {
                        updateConfig('dotsOptions.gradient', undefined);
                      }
                    }}
                    className="accent-accent"
                  />
                </div>
                
                {config.dotsOptions.gradient && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <Label>Tipo de Gradiente</Label>
                      <Select 
                        value={config.dotsOptions.gradient.type}
                        onChange={(e) => updateConfig('dotsOptions.gradient.type', e.target.value)}
                        options={[
                          { label: 'Linear', value: 'linear' },
                          { label: 'Radial', value: 'radial' },
                        ]}
                      />
                    </div>
                    <div>
                      <Label>Cor Secundária</Label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={config.dotsOptions.gradient.colorStops[1].color}
                          onChange={(e) => {
                            const stops = [...config.dotsOptions.gradient!.colorStops];
                            stops[1].color = e.target.value;
                            updateConfig('dotsOptions.gradient.colorStops', stops);
                          }}
                          className="w-10 h-10 p-1 bg-surface border border-border cursor-pointer rounded"
                        />
                        <Input 
                          value={config.dotsOptions.gradient.colorStops[1].color}
                          onChange={(e) => {
                            const stops = [...config.dotsOptions.gradient!.colorStops];
                            stops[1].color = e.target.value;
                            updateConfig('dotsOptions.gradient.colorStops', stops);
                          }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ControlSection>

          <ControlSection title="Estilo dos Cantos">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo do Canto</Label>
                <Select 
                  value={config.cornersSquareOptions.type}
                  onChange={(e) => updateConfig('cornersSquareOptions.type', e.target.value as CornerSquareType)}
                  options={[
                    { label: 'Quadrado', value: 'square' },
                    { label: 'Ponto', value: 'dot' },
                    { label: 'Extra Arredondado', value: 'extra-rounded' },
                  ]}
                />
              </div>
              <div>
                <Label>Tipo do Ponto</Label>
                <Select 
                  value={config.cornersDotOptions.type}
                  onChange={(e) => updateConfig('cornersDotOptions.type', e.target.value as CornerDotType)}
                  options={[
                    { label: 'Quadrado', value: 'square' },
                    { label: 'Ponto', value: 'dot' },
                  ]}
                />
              </div>
            </div>
            <div>
              <Label>Cor do Quadrado do Canto</Label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={config.cornersSquareOptions.color}
                  onChange={(e) => updateConfig('cornersSquareOptions.color', e.target.value)}
                  className="w-10 h-10 p-1 bg-surface border border-border cursor-pointer rounded"
                />
                <Input 
                  value={config.cornersSquareOptions.color}
                  onChange={(e) => updateConfig('cornersSquareOptions.color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </ControlSection>

          <ControlSection title="Logotipo / Ícone">
            <div className="space-y-4">
              {!config.image ? (
                <label className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-6 hover:border-accent cursor-pointer transition-colors group bg-bg/50">
                  <Upload size={20} className="mb-2 text-text-dim group-hover:text-accent transition-colors" />
                  <span className="font-sans text-[11px] font-bold text-text-dim">ESCOLHER IMAGEM</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              ) : (
                <div className="relative group p-3 border border-border rounded-lg flex items-center gap-3 bg-bg">
                  <img src={config.image} alt="Logo" className="w-10 h-10 object-contain rounded border border-border bg-white" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-mono text-[10px] truncate text-text-dim">LOGO_ATIVO.PNG</p>
                  </div>
                  <button 
                    onClick={removeLogo}
                    className="p-2 hover:bg-red-500/10 text-red-500 transition-colors rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {config.image && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tamanho (0-1)</Label>
                      <Input 
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={config.imageOptions.imageSize}
                        onChange={(e) => updateConfig('imageOptions.imageSize', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Margem</Label>
                      <Input 
                        type="number"
                        value={config.imageOptions.margin}
                        onChange={(e) => updateConfig('imageOptions.margin', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="hide-bg"
                      checked={config.imageOptions.hideBackgroundDots}
                      onChange={(e) => updateConfig('imageOptions.hideBackgroundDots', e.target.checked)}
                      className="accent-accent"
                    />
                    <label htmlFor="hide-bg" className="font-sans text-[11px] font-bold text-text-dim cursor-pointer">
                      Remover Pontos Atrás do Logo
                    </label>
                  </div>
                </>
              )}
            </div>
          </ControlSection>

          <ControlSection title="Fundo">
            <div>
              <Label>Cor de Fundo</Label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={config.backgroundOptions.color}
                  onChange={(e) => updateConfig('backgroundOptions.color', e.target.value)}
                  className="w-10 h-10 p-1 bg-surface border border-border cursor-pointer rounded"
                />
                <Input 
                  value={config.backgroundOptions.color}
                  onChange={(e) => updateConfig('backgroundOptions.color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </ControlSection>
        </div>

        <div className="p-6 border-t border-border bg-surface shrink-0">
          <Label className="mb-3">Exportação Rápida</Label>
          <div className="grid grid-cols-4 gap-2">
            {(['png', 'jpeg', 'svg', 'pdf'] as FileExtension[]).map((ext) => (
              <button
                key={ext}
                onClick={() => rendererRef.current?.download(ext)}
                className="flex flex-col items-center justify-center p-2 border border-border hover:border-accent hover:bg-accent/5 transition-all text-text-dim hover:text-accent font-bold text-[10px]"
              >
                <Download size={12} className="mb-1" />
                {ext.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 relative flex flex-col bg-bg overflow-hidden p-8 xl:p-12">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
          <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-accent tracking-[0.2em]">MOTOR_ATIVO</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">PRE-VISUALIZAÇÃO_VIRTUAL.JSX</h2>
            </div>
            <div className="flex items-center gap-6 font-mono text-[11px] text-text-dim">
              <div className="flex flex-col items-end">
                <span className="opacity-40">RESOLUÇÃO</span>
                <span className="text-text-main font-bold">{config.width}x{config.height}PX</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-end">
                <span className="opacity-40">FORMATO</span>
                <span className="text-text-main font-bold">VEC_SVG</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <QRCodeRenderer 
              ref={rendererRef} 
              config={{
                ...config,
                data: currentProjectId 
                  ? `${window.location.origin}/scan/${currentProjectId}` 
                  : config.data
              }} 
            />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-4 rounded-lg bg-surface border border-border">
                <div className="text-[10px] font-bold text-text-dim mb-1 opacity-50 uppercase tracking-widest">Fluxo de Entrada</div>
                <div className="text-xs font-mono text-text-main truncate">{config.data}</div>
             </div>
             <div className="p-4 rounded-lg bg-surface border border-border">
                <div className="text-[10px] font-bold text-text-dim mb-1 opacity-50 uppercase tracking-widest">Nível de Correção</div>
                <div className="text-xs font-mono text-text-main">{config.qrOptions.errorCorrectionLevel} (QUARTILE)</div>
             </div>
             <div className="p-4 rounded-lg bg-surface border border-border">
                <div className="text-[10px] font-bold text-text-dim mb-1 opacity-50 uppercase tracking-widest">Carga do Sistema</div>
                <div className="text-xs font-mono text-text-main">0.02ms / 144FPS</div>
             </div>
          </div>
        </div>
      </main>
      </div>

      {/* Status Bar */}
      <footer className="h-8 border-t border-border flex items-center justify-between px-6 bg-surface shrink-0 font-mono text-[10px] text-text-dim z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="opacity-40 font-bold">FORMATO:</span>
            <span className="text-text-main">SVG_VETORIAL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-40 font-bold">DIM:</span>
            <span className="text-text-main">{config.width}X{config.height}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-40 font-bold">STATUS:</span>
            <span className="text-text-main uppercase">Sistemas operantes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>MOTOR: RENDER-VX.4</span>
          <div className="px-2 py-0.5 rounded-full border border-border bg-surface-light text-accent font-bold tracking-tighter">
            PRE-VISUALIZAÇÃO_AO_VIVO
          </div>
        </div>
      </footer>
      <AnimatePresence>
        {isProjectsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[50]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[400px] bg-surface border-l border-border shadow-2xl z-[60] flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-text-main">
                    {viewingAnalytics ? 'Monitoramento' : 'Meus Projetos'}
                  </h3>
                  <p className="text-xs text-text-dim uppercase tracking-widest mt-1">
                    {viewingAnalytics ? viewingAnalytics.name : `Total: ${projects.length}`}
                  </p>
                </div>
                <button 
                  onClick={() => viewingAnalytics ? setViewingAnalytics(null) : setIsProjectsOpen(false)}
                  className="p-2 hover:bg-surface-light rounded-full transition-colors"
                >
                  <Trash2 size={18} className={cn("transition-transform", viewingAnalytics ? "" : "rotate-45")} />
                </button>
              </div>

              {viewingAnalytics ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                   <div className="flex items-center justify-between mb-4">
                     <button 
                      onClick={() => setViewingAnalytics(null)}
                      className="flex items-center gap-2 text-[10px] font-bold text-accent hover:text-accent-hover transition-colors"
                     >
                      <ChevronLeft size={12} /> VOLTAR PARA LISTA
                     </button>
                     <a 
                      href={`/scan/${viewingAnalytics.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm"
                     >
                      TESTAR REDIRECIONAMENTO (LINK REAL)
                     </a>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-bg border border-border">
                        <div className="text-[10px] font-bold text-text-dim opacity-40 uppercase mb-1">Interações Únicas</div>
                        <div className="text-2xl font-bold text-text-main tracking-tight">
                          {analyticsData.reduce((acc, curr) => acc + curr.scans, 0)}
                        </div>
                        <div className="text-[10px] text-green-500 font-bold mt-1">+12% vs last week</div>
                      </div>
                      <div className="p-4 rounded-xl bg-bg border border-border">
                        <div className="text-[10px] font-bold text-text-dim opacity-40 uppercase mb-1">Taxa de Conversão</div>
                        <div className="text-2xl font-bold text-text-main tracking-tight">2.4%</div>
                        <div className="text-[10px] text-accent font-bold mt-1">Estável</div>
                      </div>
                   </div>

                   <section>
                    <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Volume de Acessos (7 dias)</h4>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '10px' }}
                            itemStyle={{ color: '#6366f1' }}
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                          />
                          <Bar dataKey="scans" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                   </section>

                   <div className="grid grid-cols-2 gap-6">
                      <section>
                        <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Dispositivos</h4>
                        <div className="space-y-3">
                           {((window as any)._deviceStats || [
                             { label: 'Mobile', icon: Smartphone, value: '0%', color: '#6366f1' },
                             { label: 'Desktop', icon: Monitor, value: '0%', color: '#818cf8' },
                             { label: 'Tablet', icon: Tablet, value: '0%', color: '#a5b4fc' },
                           ]).map((item: any) => (
                             <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-bg/50 border border-border/50">
                               <div className="flex items-center gap-2">
                                 <item.icon size={12} className="text-text-dim" />
                                 <span className="text-[10px] font-bold text-text-main">{item.label}</span>
                               </div>
                               <span className="text-[10px] font-mono font-bold text-accent">{item.value}</span>
                             </div>
                           ))}
                        </div>
                      </section>
                      <section>
                        <h4 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Localidades (Top)</h4>
                        <div className="space-y-3">
                           {((window as any)._locationStats || [
                             { label: 'Sem dados', visits: 0 },
                           ]).map((item: any) => (
                             <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-bg/50 border border-border/50">
                               <div className="flex items-center gap-2 overflow-hidden">
                                 <MapPin size={10} className="text-text-dim shrink-0" />
                                 <span className="text-[10px] font-bold text-text-main truncate">{item.label}</span>
                               </div>
                               <span className="text-[10px] font-mono font-bold text-text-dim italic">{item.visits}</span>
                             </div>
                           ))}
                        </div>
                      </section>
                   </div>
                </div>
              ) : (
                <>
                  <div className="p-4">
                    <button 
                      onClick={() => { createNew(); setIsProjectsOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-border rounded-lg text-xs font-bold text-text-dim hover:text-accent hover:border-accent transition-all group"
                    >
                      <Plus size={14} className="group-hover:scale-125 transition-transform" />
                      CRIAR NOVO QR CODE
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {projects.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center opacity-20 italic text-sm">
                        Nenhum projeto salvo encontrado
                      </div>
                    ) : (
                      projects.map((proj) => (
                        <div 
                          key={proj.id}
                          className={cn(
                            "group p-4 rounded-xl border border-border bg-bg/50 hover:bg-surface-light/30 transition-all",
                            currentProjectId === proj.id && "border-accent ring-1 ring-accent/20"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              {renamingId === proj.id ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    autoFocus
                                    className="bg-bg border border-accent rounded px-2 py-1 text-xs font-bold text-text-main w-full focus:outline-none"
                                    value={renamingValue}
                                    onChange={(e) => setRenamingValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') renameProject(proj.id);
                                      if (e.key === 'Escape') setRenamingId(null);
                                    }}
                                    onBlur={() => setRenamingId(null)}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => loadProject(proj)}>
                                  <h4 className="text-sm font-bold text-text-main truncate group-hover:text-accent transition-colors">
                                    {proj.name}
                                  </h4>
                                </div>
                              )}
                              <span className="text-[10px] text-text-dim font-mono block mt-0.5">
                                {new Date(proj.updatedAt?.toDate()).toLocaleString()}
                              </span>
                            </div>
                            <div className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter ml-2",
                              proj.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {proj.active ? 'ATIVO' : 'INATIVO'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <AnimatePresence mode="wait">
                              {deletingId === proj.id ? (
                                <motion.div 
                                  key="confirm"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="flex-1 flex items-center gap-1"
                                >
                                  <button 
                                    onClick={() => deleteProject(proj.id)}
                                    className="flex-1 text-[9px] font-bold py-1.5 px-2 rounded bg-red-500 text-white hover:bg-red-600 transition-all"
                                  >
                                    CONFIRMAR EXCLUSÃO
                                  </button>
                                  <button 
                                    onClick={() => setDeletingId(null)}
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-text-main transition-colors text-[9px] font-bold"
                                  >
                                    CANCELAR
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.div 
                                  key="actions"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="flex-1 flex items-center gap-1"
                                >
                                  <button 
                                    onClick={() => loadProject(proj)}
                                    className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                                  >
                                    EDITAR
                                  </button>
                                  <button 
                                    onClick={() => loadAnalytics(proj)}
                                    title="Estatísticas"
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-accent transition-colors"
                                  >
                                    <BarChart3 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => { setRenamingId(proj.id); setRenamingValue(proj.name); }}
                                    title="Renomear"
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-accent transition-colors"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => toggleProjectStatus(proj)}
                                    title={proj.active ? "Desativar" : "Ativar"}
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-accent transition-colors"
                                  >
                                    {proj.active ? <Power size={14} /> : <PowerOff size={14} />}
                                  </button>
                                  <button 
                                    onClick={() => duplicateProject(proj)}
                                    title="Duplicar"
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-accent transition-colors"
                                  >
                                    <Copy size={14} />
                                  </button>
                                  <button 
                                    onClick={() => setDeletingId(proj.id)}
                                    title="Excluir"
                                    className="p-1.5 rounded bg-surface-light text-text-dim hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
