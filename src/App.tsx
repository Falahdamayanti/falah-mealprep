import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShoppingCart, 
  Wallet, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Utensils,
  Leaf,
  Beef,
  Coffee,
  Sparkles,
  Save,
  X,
  Users,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WeeklyPlan, BudgetSettings, DayPlan, MenuItem, MealType } from './types';
import { generateWeeklyPlan, estimatePrices } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

const INITIAL_PLAN: WeeklyPlan = {
  plan: DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: {
      breakfast: { items: [] },
      lunch: { items: [] },
      dinner: { items: [] },
      snacks: []
    }
  }), {} as Record<string, DayPlan>),
  shoppingList: []
};

export default function App() {
  const [planData, setPlanData] = useState<WeeklyPlan>(() => {
    const saved = localStorage.getItem('meal_plan_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          plan: parsed.plan || INITIAL_PLAN.plan,
          shoppingList: parsed.shoppingList || []
        };
      } catch (e) {
        return INITIAL_PLAN;
      }
    }
    return INITIAL_PLAN;
  });

  const plan = planData.plan;
  const shoppingList = planData.shoppingList;

  const [budget, setBudget] = useState<BudgetSettings>(() => {
    const saved = localStorage.getItem('budget_settings');
    const defaultSettings: BudgetSettings = { monthlyBudget: 2000000, currency: 'IDR', servings: 2 };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed, servings: parsed.servings || 2 };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [activeDay, setActiveDay] = useState('Sabtu');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<MenuItem | null>(null);
  const [preferences, setPreferences] = useState('');

  useEffect(() => {
    localStorage.setItem('meal_plan_v2', JSON.stringify(planData));
  }, [planData]);

  useEffect(() => {
    localStorage.setItem('budget_settings', JSON.stringify(budget));
  }, [budget]);

  const totalWeeklyCost = useMemo(() => {
    if (!plan) return 0;
    return (Object.values(plan) as DayPlan[]).reduce((acc: number, day: DayPlan) => {
      if (!day) return acc;
      const breakfast = day.breakfast?.items?.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0) || 0;
      const lunch = day.lunch?.items?.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0) || 0;
      const dinner = day.dinner?.items?.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0) || 0;
      const snacks = day.snacks?.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0) || 0;
      return acc + breakfast + lunch + dinner + snacks;
    }, 0);
  }, [plan]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    const newPlan = await generateWeeklyPlan(budget, preferences);
    if (newPlan) {
      setPlanData(newPlan);
    }
    setIsGenerating(false);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetPlan = () => {
    setPlanData(INITIAL_PLAN);
    setPreferences('');
    localStorage.removeItem('meal_plan_v2');
    setShowResetConfirm(false);
  };

  const handleDownloadGuide = () => {
    let content = `# PANDUAN MAKAN MINGGUAN - FALAH MEALPREP\n\n`;
    content += `Total Anggaran: ${formatCurrency(budget.monthlyBudget)} / bulan\n`;
    content += `Jumlah Anggota Keluarga: ${budget.servings} orang\n`;
    content += `Estimasi Biaya Mingguan: ${formatCurrency(totalWeeklyCost)}\n\n`;
    content += `--------------------------------------------------\n\n`;

    DAYS.forEach(day => {
      const dayPlan = plan[day];
      if (!dayPlan) return;

      content += `## ${day.toUpperCase()}\n\n`;
      
      const sections = [
        { label: 'SARAPAN', items: dayPlan.breakfast?.items || [] },
        { label: 'MAKAN SIANG', items: dayPlan.lunch?.items || [] },
        { label: 'MAKAN MALAM', items: dayPlan.dinner?.items || [] },
        { label: 'CAMILAN', items: dayPlan.snacks || [] }
      ];

      sections.forEach(section => {
        if (section.items && section.items.length > 0) {
          content += `### ${section.label}\n`;
          section.items.forEach(item => {
            content += `- ${item.name} (${formatCurrency(item.estimatedPrice)})\n`;
            if (item.ingredients && item.ingredients.length > 0) {
              content += `  Bahan: ${item.ingredients.join(', ')}\n`;
            }
            if (item.instructions && item.instructions.length > 0) {
              content += `  Cara Memasak:\n`;
              item.instructions.forEach((step, i) => {
                content += `    ${i + 1}. ${step}\n`;
              });
            }
            content += `\n`;
          });
        }
      });
      content += `--------------------------------------------------\n\n`;
    });

    content += `## DAFTAR BELANJA\n\n`;
    const safeShoppingList = shoppingList || [];
    const rawItems = safeShoppingList.filter(i => i.category === 'raw');
    const spiceItems = safeShoppingList.filter(i => i.category === 'spice');

    if (rawItems.length > 0) {
      content += `### BAHAN BAKU\n`;
      rawItems.forEach(item => {
        content += `- ${item.name} (${item.quantity}): ${formatCurrency(item.price)}\n`;
      });
      content += `\n`;
    }

    if (spiceItems.length > 0) {
      content += `### BUMBU & LAINNYA\n`;
      spiceItems.forEach(item => {
        content += `- ${item.name} (${item.quantity}): ${formatCurrency(item.price)}\n`;
      });
      content += `\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Panduan_Makan_Falah_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addItem = (day: string, type: MealType | 'snacks', category: MenuItem['category']) => {
    const newItem: MenuItem = {
      name: 'New Item',
      category,
      estimatedPrice: 0,
      ingredients: [],
      instructions: []
    };

    setPlanData(prev => {
      const newPlan = { ...prev.plan };
      if (!newPlan[day]) return prev;

      if (type === 'snacks') {
        newPlan[day].snacks = [...(newPlan[day].snacks || []), newItem];
      } else {
        if (!newPlan[day][type]) return prev;
        newPlan[day][type].items = [...(newPlan[day][type].items || []), newItem];
      }
      return { ...prev, plan: newPlan };
    });
  };

  const removeItem = (day: string, type: MealType | 'snacks', index: number) => {
    setPlanData(prev => {
      const newPlan = { ...prev.plan };
      if (!newPlan[day]) return prev;

      if (type === 'snacks') {
        newPlan[day].snacks = (newPlan[day].snacks || []).filter((_, i) => i !== index);
      } else {
        if (!newPlan[day][type]) return prev;
        newPlan[day][type].items = (newPlan[day][type].items || []).filter((_, i) => i !== index);
      }
      return { ...prev, plan: newPlan };
    });
  };

  const updateItem = (day: string, type: MealType | 'snacks', index: number, field: keyof MenuItem, value: any) => {
    setPlanData(prev => {
      const newPlan = { ...prev.plan };
      if (!newPlan[day]) return prev;

      if (type === 'snacks') {
        if (!newPlan[day].snacks || !newPlan[day].snacks[index]) return prev;
        newPlan[day].snacks[index] = { ...newPlan[day].snacks[index], [field]: value };
      } else {
        if (!newPlan[day][type] || !newPlan[day][type].items || !newPlan[day][type].items[index]) return prev;
        newPlan[day][type].items[index] = { ...newPlan[day][type].items[index], [field]: value };
      }
      return { ...prev, plan: newPlan };
    });
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: budget.currency || 'IDR',
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-pink-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pink-400 p-2 rounded-2xl text-white shadow-lg shadow-pink-100">
              <Utensils size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-purple-900">Falah MealPrep</h1>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Save size={10} />
                  Tersimpan
                </div>
              </div>
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Sahabat Perencana Makan Semua Ibu</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleDownloadGuide}
              className="flex items-center gap-2 bg-sky-50 text-sky-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-sky-100 transition-colors"
            >
              <Download size={16} />
              Unduh Panduan
            </button>
            <button 
              onClick={() => setShowShoppingList(true)}
              className="flex items-center gap-2 bg-pink-400 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-pink-500 transition-colors shadow-lg shadow-pink-100"
            >
              <ShoppingCart size={16} />
              Daftar Belanja
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Budget */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-sky-50">
            <div className="flex items-center gap-2 mb-4 text-sky-300">
              <Wallet size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Anggaran Bulanan</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-sky-400 mb-1">Total Anggaran (IDR)</label>
                <input 
                  type="number" 
                  value={budget.monthlyBudget}
                  onChange={(e) => setBudget(prev => ({ ...prev, monthlyBudget: Number(e.target.value) }))}
                  className="w-full text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 text-sky-900"
                />
              </div>
              
              <div className="pt-4 border-t border-sky-50">
                <div className="flex items-center gap-2 mb-2 text-sky-300">
                  <Users size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Anggota Keluarga</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setBudget(prev => ({ ...prev, servings: Math.max(1, prev.servings - 1) }))}
                    className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center text-sky-900">{budget.servings || 2}</span>
                  <button 
                    onClick={() => setBudget(prev => ({ ...prev, servings: prev.servings + 1 }))}
                    className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-sky-300 font-medium">Orang</span>
                </div>
              </div>

              <div className="pt-4 border-t border-sky-50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sky-400">Target Mingguan</span>
                  <span className="font-medium text-sky-900">{formatCurrency(budget.monthlyBudget / 4)}</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-sky-400">Rencana Saat Ini</span>
                  <span className={cn(
                    "font-bold",
                    totalWeeklyCost > budget.monthlyBudget / 4 ? "text-rose-400" : "text-sky-500"
                  )}>
                    {formatCurrency(totalWeeklyCost)}
                  </span>
                </div>
                <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalWeeklyCost / (budget.monthlyBudget / 4)) * 100, 100)}%` }}
                    className={cn(
                      "h-full transition-all duration-500",
                      totalWeeklyCost > budget.monthlyBudget / 4 ? "bg-rose-400" : "bg-sky-400"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-sky-50 rounded-[2.5rem] p-6 border border-sky-100">
            <div className="flex items-center gap-2 mb-4 text-sky-500">
              <Sparkles size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Rekomendasi AI</span>
            </div>
            <p className="text-sm text-sky-800 mb-4 leading-relaxed">
              Falah AI akan membantu menyusun menu cantik & hemat untukmu! ✨
            </p>
            <textarea 
              placeholder="Contoh: Menu sehat, banyak buah, warna-warni... 🌸"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="w-full bg-white/50 border-sky-200 rounded-2xl text-sm p-3 mb-4 focus:ring-sky-400 focus:border-sky-400 placeholder:text-sky-300"
              rows={3}
            />
            <button 
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full bg-sky-400 text-white py-3 rounded-2xl font-bold hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-100"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {isGenerating ? 'Menyusun...' : 'Buat Rencana Makan'}
            </button>

            <button 
              onClick={() => setShowResetConfirm(true)}
              className="w-full mt-2 bg-white/50 text-sky-400 py-3 rounded-2xl font-bold hover:bg-white/80 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Reset Semua Data
            </button>
          </div>
        </aside>

        {/* Main Content / Planner */}
        <div className="lg:col-span-8 space-y-6">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  activeDay === day 
                    ? "bg-sky-400 text-white shadow-lg shadow-sky-100" 
                    : "bg-white text-sky-400 hover:bg-sky-50"
                )}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Day View */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(mealType => (
                <div key={mealType} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-sky-50">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-400">
                        {mealType === 'breakfast' && <Coffee size={20} />}
                        {mealType === 'lunch' && <Utensils size={20} />}
                        {mealType === 'dinner' && <Utensils size={20} />}
                      </div>
                      <h3 className="font-bold text-sm text-sky-900">
                        {mealType === 'breakfast' ? 'Sarapan' : mealType === 'lunch' ? 'Makan Siang' : 'Makan Malam'}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => addItem(activeDay, mealType, 'vegetable')}
                        className="p-2 rounded-xl hover:bg-sky-50 text-sky-500 transition-colors"
                        title="Tambah Sayur"
                      >
                        <Leaf size={18} />
                      </button>
                      <button 
                        onClick={() => addItem(activeDay, mealType, 'main')}
                        className="p-2 rounded-xl hover:bg-pink-50 text-pink-500 transition-colors"
                        title="Tambah Lauk Utama"
                      >
                        <Beef size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {plan[activeDay]?.[mealType]?.items?.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-3 rounded-2xl bg-sky-50/30 group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            item.category === 'vegetable' ? "bg-sky-300" : "bg-pink-300"
                          )} />
                          <input 
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(activeDay, mealType, idx, 'name', e.target.value)}
                            className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 text-sky-900"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-sky-300 font-bold">Rp</span>
                            <input 
                              type="number"
                              value={item.estimatedPrice}
                              onChange={(e) => updateItem(activeDay, mealType, idx, 'estimatedPrice', Number(e.target.value))}
                              className="w-20 bg-transparent border-none p-0 text-sm font-bold text-right focus:ring-0 text-sky-900"
                            />
                          </div>
                          <button 
                            onClick={() => removeItem(activeDay, mealType, idx)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-sky-200 hover:text-rose-400 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between pl-6">
                          {item.ingredients && item.ingredients.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.ingredients?.map((ing, i) => (
                                <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded-full text-sky-400 border border-sky-50">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.instructions && item.instructions.length > 0 && (
                            <button 
                              onClick={() => setSelectedRecipe(item)}
                              className="text-[10px] font-bold text-sky-500 hover:text-sky-600 underline underline-offset-2"
                            >
                              Lihat Resep
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(plan[activeDay]?.[mealType]?.items?.length || 0) === 0 && (
                      <p className="text-center py-4 text-sky-300 text-sm italic">Belum ada menu yang direncanakan</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Snacks Section */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-pink-50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-400">
                      <Coffee size={20} />
                    </div>
                    <h3 className="font-bold text-purple-900">Camilan & Pencuci Mulut</h3>
                  </div>
                  <button 
                    onClick={() => addItem(activeDay, 'snacks', 'snack')}
                    className="p-2 rounded-xl hover:bg-fuchsia-50 text-fuchsia-600 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  {plan[activeDay]?.snacks?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-purple-50/30 group">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                      <input 
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(activeDay, 'snacks', idx, 'name', e.target.value)}
                        className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 text-purple-900"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-300 font-bold">Rp</span>
                        <input 
                          type="number"
                          value={item.estimatedPrice}
                          onChange={(e) => updateItem(activeDay, 'snacks', idx, 'estimatedPrice', Number(e.target.value))}
                          className="w-20 bg-transparent border-none p-0 text-sm font-bold text-right focus:ring-0 text-purple-900"
                        />
                      </div>
                      <button 
                        onClick={() => removeItem(activeDay, 'snacks', idx)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-purple-200 hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Shopping List Modal */}
      <AnimatePresence>
        {showShoppingList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShoppingList(false)}
              className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-sky-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-sky-900">Daftar Belanja Falah</h2>
                  <p className="text-sm text-sky-400">Dioptimalkan untuk penggunaan kembali bahan baku</p>
                </div>
                <button 
                  onClick={() => setShowShoppingList(false)}
                  className="p-2 hover:bg-sky-50 rounded-full transition-colors text-sky-300"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="space-y-8">
                  {/* Raw Ingredients */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-4 flex items-center gap-2">
                      <Leaf size={14} /> Bahan Baku
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {(shoppingList || []).filter(i => i.category === 'raw').map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/50">
                          <div>
                            <p className="text-sm font-bold text-sky-900">{item.name}</p>
                            <p className="text-[10px] text-sky-400">{item.quantity}</p>
                          </div>
                          <span className="text-sm font-bold text-sky-600">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spices */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-pink-500 mb-4 flex items-center gap-2">
                      <Sparkles size={14} /> Bumbu & Penyedap
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(shoppingList || []).filter(i => i.category === 'spice').map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/50">
                          <div>
                            <p className="text-sm font-bold text-sky-900">{item.name}</p>
                            <p className="text-[10px] text-sky-400">{item.quantity}</p>
                          </div>
                          <span className="text-xs font-bold text-pink-600">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-sky-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Total Anggaran Mingguan</p>
                  <p className="text-3xl font-bold text-sky-900">{formatCurrency((shoppingList || []).reduce((s, i) => s + i.price, 0))}</p>
                </div>
                <button 
                  className="bg-sky-400 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-sky-100 hover:bg-sky-500 transition-all"
                  onClick={() => window.print()}
                >
                  Cetak Daftar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-purple-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-purple-900 mb-2">Hapus Semua Data?</h2>
              <p className="text-purple-400 text-sm mb-8 leading-relaxed">
                Tindakan ini akan menghapus seluruh rencana makan dan daftar belanja yang telah Anda buat.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResetPlan}
                  className="w-full py-4 bg-pink-400 text-white rounded-2xl font-bold hover:bg-pink-500 transition-all shadow-lg shadow-pink-100"
                >
                  Ya, Hapus Sekarang
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-purple-50 text-purple-600 rounded-2xl font-bold hover:bg-purple-100 transition-all"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recipe Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecipe(null)}
              className="absolute inset-0 bg-purple-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-sky-900">{selectedRecipe.name}</h2>
                    <p className="text-sm text-sky-400 capitalize">Hidangan {selectedRecipe.category === 'vegetable' ? 'Sayur' : 'Utama'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedRecipe(null)}
                    className="p-2 rounded-full hover:bg-sky-50 text-sky-300 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-sky-300 mb-3">Bahan-bahan</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.ingredients?.map((ing, i) => (
                        <span key={i} className="px-3 py-1 bg-sky-50 rounded-full text-sm text-sky-600 border border-sky-100">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-sky-300 mb-3">Instruksi Memasak</h3>
                    <div className="space-y-4">
                      {selectedRecipe.instructions?.map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <p className="text-sm text-sky-600 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="w-full mt-8 py-4 bg-sky-400 text-white rounded-2xl font-bold hover:bg-sky-500 transition-all shadow-lg shadow-sky-100"
                >
                  Mengerti!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Quick Stats */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-sky-50 px-6 py-4 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Total Mingguan</p>
              <p className="font-bold text-sky-900">{formatCurrency(totalWeeklyCost)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Rata-rata Harian</p>
              <p className="font-bold text-sky-900">{formatCurrency(totalWeeklyCost / 7)}</p>
            </div>
          </div>
          <p className="text-xs text-sky-300 italic">Sahabat Ibu: Bahan baku digunakan kembali untuk menu berbeda.</p>
        </div>
      </footer>
    </div>
  );
}
