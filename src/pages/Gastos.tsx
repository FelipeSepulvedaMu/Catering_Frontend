import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Receipt, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';

export default function Gastos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  
  // Form
  const [concepto, setConcepto] = useState('');
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      const res = await fetchApi('/api/eventos');
      const data = await res.json();
      // Filtrar eventos cancelados y los que ya tienen gastos (total_gastos > 0)
      const activos = data.filter((e: any) => e.estado !== 'cancelado' && Number(e.total_gastos) === 0);
      setEventos(activos);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const fetchGastos = async (eventoId: number) => {
    setLoadingGastos(true);
    try {
      const res = await fetchApi(`/api/eventos/${eventoId}/gastos`);
      const data = await res.json();
      setGastos(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar gastos');
    } finally {
      setLoadingGastos(false);
    }
  };

  const selectedEvent = eventos.find(e => e.id === selectedEventId);

  useEffect(() => {
    if (selectedEvent) {
      fetchGastos(selectedEvent.id);
    } else {
      setGastos([]);
    }
  }, [selectedEvent]);

  const handleAddGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim() || !valor || !selectedEvent) return;
    
    setSaving(true);
    try {
      const res = await fetchApi(`/api/eventos/${selectedEvent.id}/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepto, valor: parseInt(valor) })
      });
      
      if (res.ok) {
        toast.success('Gasto agregado');
        setConcepto('');
        setValor('');
        fetchGastos(selectedEvent.id);
      } else {
        toast.error('Error al agregar gasto');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGasto = async (id: number) => {
    if (!selectedEvent) return;
    try {
      const res = await fetchApi(`/api/gastos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Gasto eliminado');
        fetchGastos(selectedEvent.id);
      } else {
        toast.error('Error al eliminarr gasto');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '';
    try {
      const rawDate = fecha.includes('T') ? fecha.split('T')[0] : fecha;
      const [year, month, day] = rawDate.split('-');
      return `${day}-${month}-${year}`;
    } catch (e) {
      return fecha;
    }
  };

  const totalGastos = gastos.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Ingresar Gastos</h1>
      </header>

      <main className="p-4 max-w-3xl mx-auto relative z-10 mt-4 space-y-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando eventos...</div>
        ) : (
          <>
            {/* Selector de Evento */}
            <div className="bg-[#DDDADA]/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/50">
              <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Evento</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              >
                <option value="">-- Selecciona un evento --</option>
                {eventos.map(evento => (
                  <option key={evento.id} value={evento.id}>
                    {formatFecha(evento.fecha)} - {evento.productora_nombre} ({evento.estado})
                  </option>
                ))}
              </select>
              {eventos.length === 0 && (
                 <p className="text-xs text-gray-500 mt-2">No hay eventos activos sin gastos.</p>
              )}
            </div>

            {selectedEvent && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                      {formatFecha(selectedEvent.fecha)}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedEvent.productora_nombre} - {selectedEvent.contacto_nombre}</p>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4 mr-1" /> {selectedEvent.direccion || "Sin dirección"}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Estado</p>
                    <p className="font-bold text-gray-800 capitalize">{selectedEvent.estado}</p>
                  </div>
                </div>

                <div className="bg-[#DDDADA]/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/50">
                  <form onSubmit={handleAddGasto} className="mb-8">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-purple-600" /> Nuevo Gasto
                    </h3>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-grow">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Concepto</label>
                        <input
                          type="text"
                          required
                          value={concepto}
                          onChange={(e) => setConcepto(e.target.value)}
                          placeholder="Ej: Hielo, Transporte..."
                          className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                      </div>
                      <div className="md:w-1/3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Valor</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-medium">$</span>
                          </div>
                          <input
                            type="number"
                            required
                            min="1"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="0"
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="w-full md:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex justify-center items-center transition-colors shadow-md h-[46px]"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Agregar
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="bg-white/60 p-4 rounded-2xl border border-white/50">
                    <div className="flex justify-between items-end mb-4 border-b border-gray-200 pb-2">
                      <h3 className="font-bold text-gray-800">Lista de Gastos del Evento</h3>
                      <span className="text-sm font-bold text-red-600">Total: {formatMoney(totalGastos)}</span>
                    </div>
                    
                    {loadingGastos ? (
                      <div className="text-center py-4 text-gray-500 text-sm">Cargando gastos...</div>
                    ) : gastos.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-gray-100 text-gray-500 text-sm">
                        No hay gastos registrados.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {gastos.map(gasto => (
                          <div key={gasto.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-purple-200 transition-colors">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{gasto.concepto}</p>
                              <p className="text-[10px] text-gray-500 font-medium mt-0.5">{format(parseISO(gasto.fecha_creacion), "d MMM HH:mm", { locale: es })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-red-600">{formatMoney(gasto.valor)}</span>
                              <button 
                                onClick={() => handleDeleteGasto(gasto.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
