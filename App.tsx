import React, { useState, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateRedesign } from './services/geminiService';
import { AppStatus, GeneratedImage, HistoryItem } from './types';

type ThemeColor = 'indigo' | 'blue' | 'teal' | 'emerald' | 'orange' | 'rose';

// Map colors to specific Hex codes to ensure they render without Tailwind CSS variables
const THEME_COLORS: Record<ThemeColor, string> = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  teal: '#14b8a6',
  emerald: '#10b981',
  orange: '#f97316',
  rose: '#f43f5e'
};

const App: React.FC = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');

  // App State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string>('image/jpeg');
  
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [prompt, setPrompt] = useState<string>('Quero criar um design moderno neste ambiente. MANTENHA A TV e o tamanho da sala EXATAMENTE iguais. Apenas troque a decoração.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Dynamic Theme Colors
  const getThemeClasses = () => {
    const base = isDarkMode 
      ? "bg-[#141218] text-[#E6E1E5]" 
      : "bg-[#F7F2FA] text-[#1C1B1F]";
    return base;
  };
  
  const getTextGradient = () => {
    switch(themeColor) {
      case 'blue': return 'from-blue-400 to-cyan-500';
      case 'teal': return 'from-teal-400 to-emerald-500';
      case 'emerald': return 'from-emerald-400 to-green-500';
      case 'orange': return 'from-orange-400 to-amber-500';
      case 'rose': return 'from-rose-400 to-pink-500';
      default: return 'from-indigo-400 to-purple-500';
    }
  };

  const handleImageSelect = (base64: string, mimeType: string) => {
    setOriginalImage(base64);
    setOriginalMimeType(mimeType);
    setStatus(AppStatus.IDLE);
    setGeneratedImage(null);
    setErrorMsg(null);
    setSuggestion(null);
    setRefinePrompt('');
    setHistory([]);
    setSelectedHistoryId(null);
  };

  const addToHistory = (image: GeneratedImage, promptText: string, suggestionText: string | null) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      generatedImage: image,
      prompt: promptText,
      suggestion: suggestionText,
      timestamp: Date.now()
    };
    
    setHistory(prev => [...prev, newItem]);
    setSelectedHistoryId(newItem.id);
    setGeneratedImage(image);
    setSuggestion(suggestionText);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setGeneratedImage(item.generatedImage);
    setSuggestion(item.suggestion);
  };

  const getAspectRatioConfig = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const supported = [
          { str: "1:1", val: 1.0 },
          { str: "3:4", val: 0.75 },
          { str: "4:3", val: 1.333 },
          { str: "9:16", val: 0.5625 },
          { str: "16:9", val: 1.778 }
        ];
        const closest = supported.reduce((prev, curr) => {
          return (Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev);
        });
        resolve(closest.str);
      };
      img.onerror = () => resolve("1:1"); // Fallback
      img.src = base64;
    });
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt) return;

    setStatus(AppStatus.LOADING);
    setErrorMsg(null);
    setSuggestion(null);

    try {
      const aspectRatio = await getAspectRatioConfig(originalImage);
      const result = await generateRedesign(originalImage, prompt, originalMimeType, aspectRatio);
      
      if (result.image) {
        setStatus(AppStatus.SUCCESS);
        addToHistory(result.image, prompt, result.text);
      } else {
        const msg = result.text 
            ? `A IA não gerou uma imagem, mas respondeu: "${result.text}"` 
            : "A imagem não foi gerada. Tente ajustar o prompt para ser mais claro.";
        throw new Error(msg);
      }
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorMsg(error.message || "Ocorreu um erro ao gerar a imagem.");
    }
  };

  const handleRefine = async () => {
    if (!originalImage || !generatedImage || !refinePrompt.trim()) return;

    setIsRefining(true);
    setErrorMsg(null);

    try {
      const aspectRatio = await getAspectRatioConfig(originalImage);
      // For refining, we should ideally use the original image as the base to keep quality, 
      // but appending the new instruction.
      // However, to "chain" edits, we use the generated image. 
      // NOTE: Using the original image usually yields better "perspective" preservation if the goal is just to add something.
      // Let's stick to the generated one for history, but enforce strict prompts.
      const result = await generateRedesign(
        generatedImage.data, 
        refinePrompt, 
        generatedImage.mimeType,
        aspectRatio
      );
      
      if (result.image) {
        addToHistory(result.image, refinePrompt, result.text || suggestion);
        setRefinePrompt('');
      } else if (result.text) {
        setSuggestion(result.text);
        if (!result.image) {
            setErrorMsg(`A IA respondeu: "${result.text}" mas não gerou imagem.`);
        }
      } else {
        setErrorMsg("A IA não retornou alterações. Tente um prompt diferente.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Falha ao refinar o design. Tente novamente.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:${generatedImage.mimeType};base64,${generatedImage.data}`;
    link.download = `design-de-ambientes-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
    setSuggestion(null);
    setRefinePrompt('');
    setHistory([]);
    setSelectedHistoryId(null);
  };

  return (
    // ROOT: Fixed layout to prevent height collapse
    <div className={`fixed inset-0 font-sans selection:bg-${themeColor}-500 selection:text-white flex flex-col transition-colors duration-300 ${getThemeClasses()} overflow-hidden`}>
      
      {/* HEADER */}
      <header className={`flex-none z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDarkMode ? 'bg-[#141218]/80 border-white/10' : 'bg-[#F7F2FA]/80 border-black/5'}`}>
        <div className="w-full px-4 md:px-6 h-16 md:h-20 flex items-center justify-between max-w-[1920px] mx-auto">
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${getTextGradient()} shadow-lg flex items-center justify-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="hidden md:block">
              <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${getTextGradient()}`}>
                Design de Ambientes
              </h1>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Powered by Gemini 2.5 Flash
              </div>
            </div>
          </div>

          {/* Theme Controls */}
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-1 md:gap-2">
              {(Object.keys(THEME_COLORS) as ThemeColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setThemeColor(c)}
                  className={`w-4 h-4 md:w-6 md:h-6 rounded-full transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${isDarkMode ? 'ring-offset-[#141218]' : 'ring-offset-[#F7F2FA]'} ${c === themeColor ? 'scale-110' : 'ring-transparent'}`}
                  style={{ 
                    backgroundColor: THEME_COLORS[c],
                    borderColor: c === themeColor ? THEME_COLORS[c] : 'transparent',
                    boxShadow: c === themeColor ? `0 0 10px ${THEME_COLORS[c]}80` : 'none'
                  }}
                />
              ))}
            </div>
            <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-yellow-300' : 'hover:bg-black/5 text-slate-600'}`}
            >
              {isDarkMode ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col w-full h-full relative min-h-0">
        
        {/* LANDING STATE */}
        {!originalImage && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 animate-fadeIn relative overflow-y-auto">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none opacity-20`} style={{ backgroundColor: THEME_COLORS[themeColor] }}></div>
            <h2 className="relative z-10 text-4xl md:text-6xl font-black tracking-tight mb-6">
              Design de Ambientes
              <br/>
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${getTextGradient()}`}>Inteligente</span>
            </h2>
            <p className={`relative z-10 text-lg md:text-xl max-w-2xl mb-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Faça upload, descreva sua ideia e veja a mágica acontecer.
            </p>
            <div className="relative z-10 w-full">
               <ImageUploader onImageSelect={handleImageSelect} />
            </div>
          </div>
        )}

        {/* EDITOR STATE */}
        {originalImage && !history.length && status !== AppStatus.SUCCESS && (
          <div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start max-w-[1600px] mx-auto h-full min-h-min">
              <div className={`w-full lg:w-1/2 rounded-3xl overflow-hidden relative group shadow-2xl ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-white border-black/5'} border`}>
                <img src={originalImage} alt="Original" className="w-full h-auto object-cover max-h-[70vh]" />
                <button onClick={handleReset} className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-red-500 rounded-full text-white transition-all backdrop-blur-md shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className={`w-full lg:w-1/2 p-6 md:p-8 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-[#1E1C22] border-white/5' : 'bg-white border-black/5'}`}>
                <div className="space-y-6">
                  <div>
                     <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Personalize seu ambiente</h3>
                     <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Descreva as mudanças. A estrutura e dimensões serão mantidas.</p>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className={`w-full h-40 rounded-2xl p-4 md:p-5 text-lg resize-none transition-all focus:ring-2 outline-none
                      ${isDarkMode 
                        ? 'bg-[#2B2930] text-gray-100 placeholder-gray-500 border-transparent' 
                        : 'bg-[#F3F4F6] text-gray-900 placeholder-gray-400 border-transparent'}`}
                    style={{ '--tw-ring-color': THEME_COLORS[themeColor] } as React.CSSProperties}
                    placeholder="Ex: Transforme em um escritório moderno..."
                  />
                  {errorMsg && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">{errorMsg}</div>
                  )}
                  <Button onClick={handleGenerate} themeColor={themeColor} className="w-full text-lg h-16 shadow-xl" isLoading={status === AppStatus.LOADING} disabled={!prompt.trim()}>
                    {status === AppStatus.LOADING ? 'Processando Ambiente...' : 'Gerar Novo Design'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULT STATE (Comparison & History) */}
        {generatedImage && originalImage && (
          <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
            
            {/* Top Bar (Actions + History) */}
            <div className={`flex-none w-full shadow-md z-20 ${isDarkMode ? 'bg-[#1E1C22] border-b border-white/5' : 'bg-white border-b border-black/5'}`}>
                {/* Actions */}
                <div className="px-4 md:px-8 py-3 flex items-center justify-between max-w-[1920px] mx-auto">
                     <div className="flex items-center gap-4">
                        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Resultado</h2>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'}`}>
                          v{history.findIndex(h => h.id === selectedHistoryId) + 1}
                        </span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Button onClick={handleDownload} variant="secondary" className={`!px-4 !py-2 !rounded-full text-sm flex items-center gap-2 ${isDarkMode ? 'text-white border-white/20 hover:bg-white/10' : 'text-gray-900 border-black/20 hover:bg-black/5'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span className="hidden md:inline">Download</span>
                        </Button>
                        <Button onClick={handleReset} variant="tonal" className="!px-4 !py-2 !rounded-full text-sm">Novo Projeto</Button>
                     </div>
                </div>

                {/* Thumbnails */}
                {history.length > 0 && (
                  <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-hide border-t border-white/5">
                    <div className="px-4 md:px-8 flex gap-4 min-w-max mx-auto justify-center">
                      {history.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => handleHistorySelect(item)}
                          className={`relative group flex flex-col items-center gap-2 transition-all duration-300 ${
                            selectedHistoryId === item.id ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shadow-lg`}
                             style={{ 
                               borderColor: selectedHistoryId === item.id ? THEME_COLORS[themeColor] : 'transparent',
                               boxShadow: selectedHistoryId === item.id ? `0 0 0 4px ${THEME_COLORS[themeColor]}30` : 'none'
                             }}
                          >
                            <img 
                              src={`data:${item.generatedImage.mimeType};base64,${item.generatedImage.data}`}
                              alt={`V${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            
            {/* COMPARISON AREA (Flex-1 to fill space) */}
            <div className="flex-1 relative w-full h-full bg-black/5 min-h-0">
                <div className={`absolute inset-0 opacity-[0.03] ${isDarkMode ? 'bg-[radial-gradient(#ffffff_1px,transparent_1px)]' : 'bg-[radial-gradient(#000000_1px,transparent_1px)]'} [background-size:20px_20px]`}></div>
                
                {/* Ensure explicit height/width for comparison view */}
                <div className="absolute inset-0">
                  <ComparisonView 
                    originalImage={originalImage} 
                    generatedImage={generatedImage}
                    themeColor={themeColor}
                  />
                </div>
            </div>

            {/* BOTTOM BAR (Fixed height) */}
            <div ref={bottomRef} className={`flex-none w-full border-t p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 ${isDarkMode ? 'bg-[#1E1C22] border-white/5' : 'bg-white border-black/5'}`}>
              <div className="max-w-4xl mx-auto space-y-4">
                <div className={`flex gap-3 items-center p-2 rounded-full border shadow-inner transition-colors ${isDarkMode ? 'bg-[#141218] border-white/5' : 'bg-[#F3F4F6] border-black/5'}`}>
                   <div className="pl-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   <input
                      type="text"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder="O que mudar? (ex: 'Adicionar tapete', 'Mudar cor')"
                      className={`flex-1 h-10 bg-transparent border-none focus:ring-0 text-sm md:text-base ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`}
                      disabled={isRefining}
                    />
                    <Button onClick={handleRefine} isLoading={isRefining} themeColor={themeColor} disabled={!refinePrompt.trim()} className="!h-10 !px-6 !py-0 !rounded-full !text-sm">Enviar</Button>
                </div>
                 <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['Sugerir melhorias', 'Mais iluminação', 'Adicionar plantas', 'Estilo industrial'].map((s) => (
                    <button key={s} onClick={() => setRefinePrompt(s)} className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${isDarkMode ? 'bg-[#2B2930] text-gray-300 border-white/10 hover:bg-[#36343b]' : 'bg-white text-gray-600 border-black/10 hover:bg-gray-50'}`}>{s}</button>
                  ))}
                </div>
                {(suggestion || errorMsg) && (
                  <div className={`p-4 rounded-2xl text-sm ${errorMsg ? 'bg-red-500/10 text-red-400' : isDarkMode ? 'bg-[#2B2930] text-gray-300' : 'bg-[#ECE6F0] text-gray-700'}`}>
                    <span className="font-bold block mb-1">{errorMsg ? 'Erro' : 'Insight:'}</span> {errorMsg || suggestion}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;