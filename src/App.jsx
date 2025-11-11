import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import FunnelWorkspace from './FunnelWorkspace.jsx';
import CalculatorPage from './components/calculator/CalculatorPage.jsx';

const navigationItems = [
  { to: '/', label: 'Воронка' },
  { to: '/calculator', label: 'Калькулятор услуг Anix' },
];

function Navigation() {
  const location = useLocation();

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-6">
      <span className="text-lg font-semibold text-slate-100">Anix Operations Toolkit</span>
      <div className="flex flex-wrap items-center gap-2">
        {navigationItems.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/' || location.pathname === ''
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                  : 'border border-transparent text-slate-300 hover:text-cyan-200 hover:border-cyan-400/40',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1440px] px-6 pb-24">
        <Navigation />
        <Routes>
          <Route path="/" element={<FunnelWorkspace />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
