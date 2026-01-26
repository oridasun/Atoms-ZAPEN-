
import React, { useState, useEffect, useCallback } from 'react';
import { getQuestions } from './data';
import { Question, GameState, UserInput, ElementData } from './types';
import { 
  Check, ChevronRight, RotateCcw, Trophy, X, 
  ArrowRight, ArrowLeft, Star, BookOpen, 
  Sparkles, Loader2, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from "@google/genai";

const LEVEL_1_LIMIT = 30;
const LEVEL_2_LIMIT = 50;
const GOAL_STARS = 10;
const APP_VERSION = "v1.2-build-final";

const RutherfordAtom = ({ className = "w-12 h-12", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="2.5" fill={color} />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    <circle cx="22" cy="12" r="0.8" fill={color} />
    <circle cx="7" cy="16.3" r="0.8" fill={color} />
    <circle cx="7" cy="7.7" r="0.8" fill={color} />
  </svg>
);

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const FormulaBadge = ({ label, formula }: { label: string, formula: string }) => (
  <div className="bg-white/50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center min-w-[80px]">
    <span className="text-[9px] font-bold text-emerald-600 uppercase mb-1">{label}</span>
    <span className="text-xs font-mono font-bold text-emerald-900">{formula}</span>
  </div>
);

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [level, setLevel] = useState<1 | 2>(1);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [failures, setFailures] = useState(0);
  const [userInput, setUserInput] = useState<UserInput>({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    setAllQuestions(getQuestions());
  }, []);

  const currentQuestion = activeQuestions[currentIndex];

  const startGame = (selectedLevel: 1 | 2) => {
    setLevel(selectedLevel);
    // Filtrar preguntas según el nivel seleccionado
    const pool = selectedLevel === 1 
      ? allQuestions.slice(0, LEVEL_1_LIMIT) 
      : allQuestions.slice(0, LEVEL_2_LIMIT); // Nivel 2 incluye los 50 ejercicios
    
    setActiveQuestions(shuffleArray(pool));
    setCurrentIndex(0);
    setStars(0);
    setFailures(0);
    setFeedback(null);
    setUserInput({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
    setGameState('PLAYING');
  };

  const handleInputChange = (field: keyof UserInput, value: string) => {
    setUserInput(prev => ({ ...prev, [field]: value }));
  };

  const normalizeCharge = (val: string) => {
    const v = val.trim().toLowerCase();
    if (!v || v === '0' || v === 'neutro') return '0';
    const match = v.match(/^([+-])?(\d+)([+-])?$/);
    if (match) {
      const num = match[2];
      const sign = match[1] || match[3] || '+';
      return `${num}${sign}`;
    }
    return v;
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;
    let isAllCorrect = true;
    currentQuestion.hiddenFields.forEach(field => {
      let userVal = userInput[field as keyof UserInput].trim();
      let correctVal = String(currentQuestion[field as keyof ElementData]);
      
      if (field === 'charge') {
        userVal = normalizeCharge(userVal);
        correctVal = normalizeCharge(correctVal);
      } else if (field === 'name' || field === 'symbol') {
        userVal = userVal.toLowerCase();
        correctVal = correctVal.toLowerCase();
      }
      
      if (userVal !== correctVal) isAllCorrect = false;
    });

    if (isAllCorrect) {
      setFeedback('correct');
      setStars(s => {
        const next = s + 1;
        if (next === GOAL_STARS) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        return next;
      });
      setAiExplanation(null);
    } else {
      setFeedback('incorrect');
      setFailures(f => f + 1);
    }
  };

  const askGemini = async () => {
    if (!currentQuestion) return;
    setAiLoading(true);
    setAiExplanation(null);
    try {
      // Fix: Ensure a fresh GoogleGenAI instance is created for the request.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptText = `Explica la estructura atómica de ${currentQuestion.name}: Z=${currentQuestion.z}, A=${currentQuestion.a}, P=${currentQuestion.p}, E=${currentQuestion.e}, N=${currentQuestion.n}, Carga=${currentQuestion.charge}. Sé breve.`;
      // Fix: Use simple string input for contents as per simplified GenerateContentParameters guidelines.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptText
      });
      setAiExplanation(response.text);
    } catch (error) {
      setAiExplanation("Error al conectar con la IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const nextQuestion = () => {
    if (stars >= GOAL_STARS) {
      setGameState('SUMMARY');
      return;
    }
    setFeedback(null);
    setAiExplanation(null);
    setUserInput({ symbol: '', name: '', z: '', a: '', p: '', e: '', n: '', charge: '' });
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const pool = level === 1 ? allQuestions.slice(0, LEVEL_1_LIMIT) : allQuestions.slice(0, LEVEL_2_LIMIT);
      setActiveQuestions(shuffleArray(pool));
      setCurrentIndex(0);
    }
  };

  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-xl w-full glass-card border-8 border-white/20">
          <div className="flex justify-center mb-8">
            <RutherfordAtom className="w-20 h-20" color="#059669" />
          </div>
          <h1 className="text-5xl font-black text-emerald-900 mb-4 tracking-tighter italic">Atom Master</h1>
          <p className="text-emerald-700/80 mb-10 font-medium">Domina la estructura de átomos e iones.</p>
          
          <div className="grid grid-cols-1 gap-4 mb-8">
            <button onClick={() => startGame(1)} className="group bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl flex items-center justify-between px-8">
              <span className="text-lg">Nivel 1: Átomos Neutros</span>
              {/* Fix: Play icon is now available after adding it to the imports */}
              <Play className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => startGame(2)} className="group bg-slate-900 hover:bg-black text-white font-black py-6 rounded-3xl transition-all shadow-xl flex items-center justify-between px-8">
              <span className="text-lg">Nivel 2: Iones (Carga ≠ 0)</span>
              {/* Fix: Play icon is now available after adding it to the imports */}
              <Play className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="text-[10px] text-emerald-900/40 font-bold uppercase tracking-widest">{APP_VERSION}</div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center border-4 border-emerald-100">
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">¡LO LOGRASTE!</h2>
          <div className="flex justify-center gap-4 mb-10">
            <div className="bg-emerald-50 px-6 py-4 rounded-3xl">
              <div className="text-3xl font-black text-emerald-700">{stars}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Estrellas</div>
            </div>
            <div className="bg-rose-50 px-6 py-4 rounded-3xl">
              <div className="text-3xl font-black text-rose-700">{failures}</div>
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-widest">Errores</div>
            </div>
          </div>
          <button onClick={() => setGameState('MENU')} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors">
            <RotateCcw size={20} /> JUGAR DE NUEVO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4 max-w-5xl mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => setGameState('MENU')} className="p-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200"><RutherfordAtom className="w-8 h-8" color="white" /></div>
          <div><h1 className="font-black text-2xl tracking-tight leading-none">Atom Master</h1><span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">NIVEL {level}</span></div>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <Star size={20} className="text-yellow-400 fill-yellow-400" />
            <span className="font-black text-emerald-800 text-xl">{stars}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
        <div className="lg:col-span-1 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 h-fit">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500 mb-6"><BookOpen size={16} /> Fórmulas</h3>
          <div className="space-y-4">
            <FormulaBadge label="Nº Másico (A)" formula="Z + N" />
            <FormulaBadge label="Carga (C)" formula="P - E" />
            <FormulaBadge label="Neutrones (N)" formula="A - Z" />
            <p className="text-[10px] text-slate-400 font-medium px-2 leading-relaxed italic">Recuerda: En átomos neutros, P = E = Z.</p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-slate-50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white h-16">
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">Nombre</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">Símbolo</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">Z</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">A</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">P</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">E</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">N</th>
                    <th className="px-4 text-[11px] font-black uppercase tracking-widest">Carga</th>
                  </tr>
                </thead>
                <tbody key={currentIndex}>
                  <tr className="h-28">
                    <DataCell field="name" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="symbol" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} isSymbol />
                    <DataCell field="z" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="a" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="p" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="e" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="n" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                    <DataCell field="charge" question={currentQuestion} userInput={userInput} onChange={handleInputChange} isResult={feedback !== null} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {feedback === 'correct' && (
              <div className="bg-emerald-500 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-xl animate-bounce-short">
                <div className="flex items-center gap-4 font-black text-lg"><Check size={32} /> ¡EXCELENTE TRABAJO!</div>
                <button onClick={nextQuestion} className="bg-white text-emerald-600 font-black py-3 px-8 rounded-2xl hover:bg-emerald-50 transition-colors">SIGUIENTE</button>
              </div>
            )}
            {feedback === 'incorrect' && (
              <div className="space-y-4">
                <div className="bg-rose-600 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4 font-black text-lg"><X size={32} /> REVISA TUS CÁLCULOS</div>
                  <button onClick={askGemini} disabled={aiLoading} className="bg-white/20 hover:bg-white/30 text-white font-black py-3 px-8 rounded-2xl transition-all flex items-center gap-2">
                    {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} AYUDA IA
                  </button>
                </div>
                {aiExplanation && <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 text-slate-700 font-medium italic animate-fade-in">{aiExplanation}</div>}
              </div>
            )}
            {feedback === null && (
              <button onClick={checkAnswer} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-3xl shadow-xl transition-all active:scale-95 text-xl tracking-tight">COMPROBAR RESPUESTA</button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-8 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">
        QUÍMICA INTERACTIVA • {APP_VERSION}
      </div>
    </div>
  );
}

const DataCell = ({ field, question, userInput, onChange, isResult, isSymbol }: any) => {
  const isHidden = question.hiddenFields.includes(field);
  const correctValue = String(question[field]);
  const userValue = userInput[field];

  const checkEquality = (u: string, c: string) => {
    if (field === 'charge') {
      const nu = u.trim().toLowerCase();
      const nc = c.trim().toLowerCase();
      if ((nu === '0' || nu === 'neutro') && nc === '0') return true;
      return nu.replace(/[^0-9+-]/g, '') === nc.replace(/[^0-9+-]/g, '');
    }
    return u.toLowerCase().trim() === c.toLowerCase().trim();
  };

  const isError = isResult && isHidden && !checkEquality(userValue, correctValue);

  if (!isHidden) {
    return (
      <td className="px-4 border-r border-slate-100 last:border-0 bg-white">
        {isSymbol ? (
          <div className="inline-flex items-center">
            <div className="flex flex-col text-[10px] mr-1 text-right font-black text-slate-400">
              <span>{question.a}</span><span>{question.z}</span>
            </div>
            <span className="text-3xl font-black text-slate-900">{question.symbol.replace(/[\d\+\-]+/g, '')}</span>
            <span className="text-[11px] font-black text-emerald-500 self-start ml-0.5">{question.charge === '0' ? '' : question.charge}</span>
          </div>
        ) : (
          <span className="text-xl font-bold text-slate-900">{correctValue === '0' ? '0' : correctValue}</span>
        )}
      </td>
    );
  }

  return (
    <td className={`px-4 border-r border-slate-100 last:border-0 ${isResult ? 'bg-white' : 'bg-emerald-50/20'}`}>
      {isResult ? (
        <div className="flex flex-col items-center justify-center">
          <span className={`text-xl font-black ${isError ? 'text-rose-500 line-through decoration-4' : 'text-emerald-600'}`}>{userValue || '?'}</span>
          {isError && <span className="text-xs font-black text-emerald-600 mt-1">{correctValue}</span>}
        </div>
      ) : (
        <input
          type="text"
          value={userValue}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="?"
          className="w-full text-center bg-white border-4 border-emerald-100 rounded-2xl py-3 focus:border-emerald-500 outline-none font-black text-xl text-emerald-900 transition-all placeholder-emerald-100"
        />
      )}
    </td>
  );
};

export default App;
