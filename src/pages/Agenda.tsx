import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, Clock, MapPin, Users, X, Play, CheckCircle, Filter, ChevronDown, Edit, CalendarClock, XCircle, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Agenda() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Modals for reprogramar and cancelar
  const [isReprogramarOpen, setIsReprogramarOpen] = useState(false);
  const [isCancelarOpen, setIsCancelarOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHoraEntrada, setNuevaHoraEntrada] = useState('');
  const [nuevaHoraSalida, setNuevaHoraSalida] = useState('');
  
  // States for extras
  const [personasExtras, setPersonasExtras] = useState<number>(0);
  const [horasExtras, setHorasExtras] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  // States for pagos
  const [abonoMonto, setAbonoMonto] = useState<number>(0);
  const [abonoFecha, setAbonoFecha] = useState<string>('');
  const [pagoFinalMonto, setPagoFinalMonto] = useState<number>(0);
  const [pagoFinalFecha, setPagoFinalFecha] = useState<string>('');

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      const res = await fetchApi('/api/eventos');
      const data = await res.json();
      setEventos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fechaStr: string) => {
    try {
      return format(parseISO(fechaStr), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return fechaStr;
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const openModal = (evento: any) => {
    setSelectedEvent(evento);
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (newStatus === 'iniciado') {
      if (!selectedEvent.direccion || !selectedEvent.hora_entrada) {
        toast.error('Debes editar el evento y completar la dirección y hora de entrada antes de iniciarlo.', { duration: 4000 });
        return;
      }
    }

    setUpdating(true);
    try {
      const res = await fetchApi(`/api/eventos/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });
      if (res.ok) {
        toast.success(`Evento marcado como ${newStatus}`);
        setSelectedEvent({ ...selectedEvent, estado: newStatus });
        fetchEventos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar estado');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const handleFinalizar = async () => {
    await handleUpdateStatus(selectedEvent.id, 'terminado');
  };

  const openReprogramar = () => {
    setNuevaFecha(selectedEvent.fecha);
    setNuevaHoraEntrada(selectedEvent.hora_entrada);
    setNuevaHoraSalida(selectedEvent.hora_salida);
    setIsReprogramarOpen(true);
  };

  const handleReprogramar = async () => {
    setUpdating(true);
    try {
      const res = await fetchApi(`/api/eventos/${selectedEvent.id}/reprogramar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: nuevaFecha, hora_entrada: nuevaHoraEntrada, hora_salida: nuevaHoraSalida })
      });
      if (res.ok) {
        toast.success('Evento reprogramado');
        setSelectedEvent({ ...selectedEvent, fecha: nuevaFecha, hora_entrada: nuevaHoraEntrada, hora_salida: nuevaHoraSalida });
        setIsReprogramarOpen(false);
        fetchEventos();
      } else {
        toast.error('Error al reprogramar');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelar = async () => {
    await handleUpdateStatus(selectedEvent.id, 'cancelado');
    setIsCancelarOpen(false);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'iniciado':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center"><Play className="w-3 h-3 mr-1" /> Iniciado</span>;
      case 'terminado':
        return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Terminado</span>;
      case 'cancelado':
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full flex items-center"><XCircle className="w-3 h-3 mr-1" /> Cancelado</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">Agendado</span>;
    }
  };

  const eventosFiltrados = eventos.filter(evento => {
    if (filtroEstado === 'todos') return true;
    return evento.estado === filtroEstado;
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4 max-w-5xl mx-auto w-full">
          <button onClick={() => navigate('/')} className="p-2 mr-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Agenda de Eventos</h1>
        </div>
        
        {/* Filtros */}
        <div className="px-4 pb-4 relative z-20 max-w-5xl mx-auto w-full">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <div className={`w-full bg-white border ${isFilterOpen ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-300'} text-gray-700 py-3 pl-10 pr-10 rounded-xl flex items-center justify-between transition-all`}>
              <span className="truncate">
                {filtroEstado === 'todos' ? 'Mostrar: Todos los eventos' : 
                 filtroEstado === 'agendado' ? 'Mostrar: Agendados' : 
                 filtroEstado === 'iniciado' ? 'Mostrar: Iniciados' : 
                 filtroEstado === 'terminado' ? 'Mostrar: Finalizados' :
                 'Mostrar: Cancelados'}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsFilterOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-4 right-4 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-40 overflow-hidden"
                >
                  {[
                    { value: 'todos', label: 'Todos los eventos' },
                    { value: 'agendado', label: 'Agendados' },
                    { value: 'iniciado', label: 'Iniciados' },
                    { value: 'terminado', label: 'Finalizados' },
                    { value: 'cancelado', label: 'Cancelados' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFiltroEstado(option.value);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                        filtroEstado === option.value 
                          ? 'bg-orange-50 text-orange-700 font-semibold' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando eventos...</div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {eventos.length === 0 ? 'No hay eventos agendados.' : 'No hay eventos para este filtro.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventosFiltrados.map((evento) => (
              <motion.div
                key={evento.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => openModal(evento)}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800 capitalize">{formatFecha(evento.fecha)}</h3>
                  {getStatusBadge(evento.estado)}
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-semibold w-24">Productora:</span>
                    <span className="truncate">{evento.productora_nombre}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{evento.direccion || <span className="text-gray-400 italic">Sin dirección</span>}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{evento.cantidad_personas + (evento.personas_extras || 0)} personas</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-[#DDDADA]/95 backdrop-blur-md rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto w-full md:max-w-lg border border-white/50"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800">Detalles</h2>
                    {getStatusBadge(selectedEvent.estado)}
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Info Básica */}
                  <div className="bg-orange-50 p-4 rounded-2xl">
                    <div className="flex items-center text-orange-800 font-bold text-lg mb-1 capitalize">
                      <Calendar className="w-5 h-5 mr-2" />
                      {formatFecha(selectedEvent.fecha)}
                    </div>
                    <div className="flex items-center text-orange-700">
                      <Clock className="w-5 h-5 mr-2" />
                      {selectedEvent.hora_entrada ? `${selectedEvent.hora_entrada} - ${selectedEvent.hora_salida}` : 'Horario por definir'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Productora</p>
                      <p className="font-medium text-gray-800">{selectedEvent.productora_nombre}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Contacto</p>
                      <p className="font-medium text-gray-800">{selectedEvent.contacto_nombre}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Valor por Persona</p>
                      <p className="font-bold text-gray-800 text-lg">{formatMoney(selectedEvent.valor_por_persona)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Valor Hora Extra</p>
                      <p className="font-bold text-gray-800">{formatMoney(selectedEvent.valor_hora_extra || 0)}</p>
                    </div>
                  </div>

                  {/* Dirección y Mapa */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-semibold mb-2">Ubicación</p>
                    <div className="flex items-start mb-3">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 shrink-0" />
                      <span className="font-medium text-gray-800">{selectedEvent.direccion || <span className="text-gray-400 italic">Sin dirección</span>}</span>
                    </div>
                    {selectedEvent.lat && selectedEvent.lng && (
                      <div className="h-40 rounded-xl overflow-hidden border border-gray-200 z-0 relative group">
                        <MapContainer 
                          center={[parseFloat(selectedEvent.lat), parseFloat(selectedEvent.lng)]} 
                          zoom={14} 
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={false}
                          dragging={false}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[parseFloat(selectedEvent.lat), parseFloat(selectedEvent.lng)]} />
                        </MapContainer>
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:opacity-100 touch-manipulation"
                           onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedEvent.lat},${selectedEvent.lng}`, '_blank')}
                        >
                          <button className="bg-white text-gray-900 px-4 py-2 rounded-full font-semibold flex items-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform cursor-pointer">
                            <Navigation className="w-4 h-4 mr-2 text-blue-600" />
                            Abrir en Maps
                          </button>
                        </div>
                      </div>
                    )}
                    {(!selectedEvent.lat || !selectedEvent.lng) && selectedEvent.direccion && (
                       <button 
                         onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.direccion)}`, '_blank')}
                         className="w-full mt-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold text-sm transition-colors flex justify-center items-center"
                       >
                         <Navigation className="w-4 h-4 mr-2" />
                         Buscar en Google Maps
                       </button>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="pt-2 flex flex-col gap-3">
                    {selectedEvent.estado === 'agendado' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedEvent.id, 'iniciado')}
                          disabled={updating}
                          className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-lg shadow-md transition-colors flex justify-center items-center"
                        >
                          <Play className="w-6 h-6 mr-2" /> Iniciar Evento
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => navigate(`/edit-event/${selectedEvent.id}`)}
                            className="py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold text-sm transition-colors flex flex-col justify-center items-center"
                          >
                            <Edit className="w-5 h-5 mb-1" /> Editar
                          </button>
                          <button
                            onClick={openReprogramar}
                            className="py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-semibold text-sm transition-colors flex flex-col justify-center items-center"
                          >
                            <CalendarClock className="w-5 h-5 mb-1" /> Reprogramar
                          </button>
                          <button
                            onClick={() => setIsCancelarOpen(true)}
                            className="py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold text-sm transition-colors flex flex-col justify-center items-center"
                          >
                            <XCircle className="w-5 h-5 mb-1" /> Cancelar
                          </button>
                        </div>
                      </>
                    )}
                    
                    {selectedEvent.estado === 'iniciado' && (
                      <button
                        onClick={handleFinalizar}
                        disabled={updating}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-md transition-colors flex justify-center items-center"
                      >
                        <CheckCircle className="w-6 h-6 mr-2" /> Finalizar Evento
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Modals Reprogramar y Cancelar */}
      <AnimatePresence>
        {isReprogramarOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReprogramarOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#DDDADA]/95 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-sm z-[70] overflow-hidden border border-white/50"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Reprogramar Evento</h3>
                <button onClick={() => setIsReprogramarOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva Fecha</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Entrada</label>
                    <input
                      type="time"
                      value={nuevaHoraEntrada}
                      onChange={(e) => setNuevaHoraEntrada(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Salida</label>
                    <input
                      type="time"
                      value={nuevaHoraSalida}
                      onChange={(e) => setNuevaHoraSalida(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsReprogramarOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReprogramar}
                  disabled={updating || !nuevaFecha || !nuevaHoraEntrada || !nuevaHoraSalida}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Guardando...' : 'Reprogramar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCancelarOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelarOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm z-[70] overflow-hidden text-center"
            >
              <div className="p-6">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl text-gray-800 mb-2">¿Cancelar Evento?</h3>
                <p className="text-gray-600 text-sm">
                  Esta acción marcará el evento como cancelado. No se eliminará, pero no se contará en los reportes.
                </p>
              </div>
              <div className="p-5 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsCancelarOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Cancelando...' : 'Sí, Cancelar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
