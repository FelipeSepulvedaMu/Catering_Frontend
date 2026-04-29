import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CalendarDays, LogOut, BarChart3, Receipt, Settings2 } from 'lucide-react';

export default function MainMenu({ setAuth }: { setAuth: (auth: boolean) => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setAuth(false);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <header className="flex justify-between items-center mb-10 pt-4 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-gray-800">Hola Tia Janis !</h1>
        <button 
          onClick={handleLogout}
          className="p-3 bg-white rounded-full shadow-sm text-gray-600 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 grid grid-cols-2 content-center gap-4 max-w-2xl mx-auto w-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/create-event')}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-400 to-rose-500 text-white rounded-3xl shadow-xl aspect-square gap-3"
        >
          <CalendarPlus className="w-12 h-12 md:w-16 md:h-16 opacity-90 shrink-0" />
          <span className="text-base md:text-xl font-bold text-center leading-tight">Crear Evento</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/agenda')}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-3xl shadow-xl aspect-square gap-3"
        >
          <CalendarDays className="w-12 h-12 md:w-16 md:h-16 opacity-90 shrink-0" />
          <span className="text-base md:text-xl font-bold text-center leading-tight">Ver Agenda</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/ajustes-evento')}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-3xl shadow-xl aspect-square gap-3"
        >
          <Settings2 className="w-12 h-12 md:w-16 md:h-16 opacity-90 shrink-0" />
          <span className="text-base md:text-xl font-bold text-center leading-tight">Ajustes y Pagos</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/gastos')}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white rounded-3xl shadow-xl aspect-square gap-3"
        >
          <Receipt className="w-12 h-12 md:w-16 md:h-16 opacity-90 shrink-0" />
          <span className="text-base md:text-xl font-bold text-center leading-tight">Ingresar Gastos</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/reportes')}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-3xl shadow-xl col-span-2 aspect-[2/1] gap-3"
        >
          <BarChart3 className="w-12 h-12 md:w-16 md:h-16 opacity-90 shrink-0" />
          <span className="text-base md:text-xl font-bold text-center leading-tight">Reportes</span>
        </motion.button>
      </div>
    </div>
  );
}
