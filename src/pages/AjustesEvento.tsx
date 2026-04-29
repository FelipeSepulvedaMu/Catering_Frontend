import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, DollarSign, PlusCircle, Calendar } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface Evento {
  id: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  productora_nombre: string;
  contacto_nombre: string;
  estado: string;
  cantidad_personas: number;
  valor_por_persona: number;
  valor_hora_extra: number;
  personas_extras: number;
  horas_extras: number;
  abono_monto: number;
  abono_fecha: string;
  pago_final_monto: number;
  pago_final_fecha: string;
  factura_base: string;
  factura_extras: string;
  pago_extras_monto: number;
  pago_extras_fecha: string;
}

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

export default function AjustesEvento() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [personasExtras, setPersonasExtras] = useState(0);
  const [horasExtras, setHorasExtras] = useState(0);
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoFecha, setAbonoFecha] = useState('');
  const [pagoFinalMonto, setPagoFinalMonto] = useState(0);
  const [pagoFinalFecha, setPagoFinalFecha] = useState('');
  const [facturaBase, setFacturaBase] = useState('');
  const [facturaExtras, setFacturaExtras] = useState('');
  const [pagoExtrasMonto, setPagoExtrasMonto] = useState(0);
  const [pagoExtrasFecha, setPagoExtrasFecha] = useState('');

  const formatInputMoney = (amount: number) => {
    if (amount === 0) return '';
    return new Intl.NumberFormat('es-CL').format(amount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setter(rawValue ? parseInt(rawValue, 10) : 0);
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      const res = await fetchApi('/api/eventos');
      const data = await res.json();
      if (res.ok) {
        // Filter out cancelled events, or maybe just show all active/completed ones
        setEventos(data.filter((e: Evento) => e.estado !== 'cancelado'));
      }
    } catch (error) {
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = eventos.find(e => e.id === selectedEventId);

  useEffect(() => {
    if (selectedEvent) {
      setPersonasExtras(selectedEvent.personas_extras || 0);
      setHorasExtras(selectedEvent.horas_extras || 0);
      setAbonoMonto(selectedEvent.abono_monto || 0);
      setAbonoFecha(selectedEvent.abono_fecha?.split('T')[0] || '');
      setPagoFinalMonto(selectedEvent.pago_final_monto || 0);
      setPagoFinalFecha(selectedEvent.pago_final_fecha?.split('T')[0] || '');
      setFacturaBase(selectedEvent.factura_base || '');
      setFacturaExtras(selectedEvent.factura_extras || '');
      setPagoExtrasMonto(selectedEvent.pago_extras_monto || 0);
      setPagoExtrasFecha(selectedEvent.pago_extras_fecha?.split('T')[0] || '');
    }
  }, [selectedEvent]);

  const handleSaveAll = async () => {
    if (!selectedEvent) return;
    
    const valorPP = selectedEvent.valor_por_persona;
    const cantBase = selectedEvent.cantidad_personas;
    const pExtras = personasExtras || 0;
    const hExtras = horasExtras || 0;
    const totalPersonas = cantBase + pExtras;
    const valorHoraExtraPP = selectedEvent.valor_hora_extra || 0;

    const baseT = valorPP * cantBase;
    const extrasT = (valorPP * pExtras) + (valorHoraExtraPP * totalPersonas * hExtras);

    if (abonoMonto + pagoFinalMonto > baseT) {
      toast.error('El abono y pago base superan el monto de la factura base');
      return;
    }

    if (pagoExtrasMonto > extrasT) {
      toast.error('El pago de extras supera el monto de la factura extras');
      return;
    }
    
    setUpdating(true);
    try {
      const [resExtras, resPagos] = await Promise.all([
        fetchApi(`/api/eventos/${selectedEvent.id}/extras`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personas_extras: personasExtras,
            horas_extras: horasExtras
          })
        }),
        fetchApi(`/api/eventos/${selectedEvent.id}/pagos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            abono_monto: abonoMonto,
            abono_fecha: abonoFecha,
            pago_final_monto: pagoFinalMonto,
            pago_final_fecha: pagoFinalFecha,
            factura_base: facturaBase,
            factura_extras: facturaExtras,
            pago_extras_monto: pagoExtrasMonto,
            pago_extras_fecha: pagoExtrasFecha
          })
        })
      ]);

      if (resExtras.ok && resPagos.ok) {
        toast.success('Ajustes y pagos guardados');
        fetchEventos();
      } else {
        toast.error('Error al guardar algunos cambios');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  // Cálculos
  let baseTotal = 0;
  let personasExtrasTotal = 0;
  let horasExtrasTotal = 0;
  let granTotal = 0;
  let totalPagado = 0;
  let saldoPendiente = 0;

  if (selectedEvent) {
    const valorPP = selectedEvent.valor_por_persona;
    const cantBase = selectedEvent.cantidad_personas;
    const pExtras = personasExtras || 0;
    const hExtras = horasExtras || 0;
    
    const totalPersonas = cantBase + pExtras;
    const valorHoraExtraPP = selectedEvent.valor_hora_extra || 0;

    baseTotal = valorPP * cantBase;
    personasExtrasTotal = valorPP * pExtras;
    horasExtrasTotal = valorHoraExtraPP * totalPersonas * hExtras;
    granTotal = baseTotal + personasExtrasTotal + horasExtrasTotal;
    totalPagado = (abonoMonto || 0) + (pagoFinalMonto || 0) + (pagoExtrasMonto || 0);
    saldoPendiente = granTotal - totalPagado;
  }

  const tieneExtras = personasExtras > 0 || horasExtras > 0;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Ajustes y Pagos del Evento</h1>
      </header>

      <main className="p-4 max-w-3xl mx-auto relative z-10 mt-4 space-y-6">
        
        {/* Selector de Evento */}
        <div className="bg-[#DDDADA]/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/50">
          <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Evento</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
          >
            <option value="">-- Selecciona un evento --</option>
            {eventos.map(evento => (
              <option key={evento.id} value={evento.id}>
                {formatFecha(evento.fecha)} - {evento.productora_nombre} ({evento.estado})
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Básica */}
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                  {formatFecha(selectedEvent.fecha)}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedEvent.productora_nombre} - {selectedEvent.contacto_nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Estado</p>
                <p className="font-bold text-gray-800 capitalize">{selectedEvent.estado}</p>
              </div>
            </div>

            <div className="bg-[#DDDADA]/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/50">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                <Save className="w-5 h-5 mr-2 text-blue-600" /> Ajustes y Pagos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Ajustes Extras */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center border-b border-gray-300 pb-2">
                    <PlusCircle className="w-4 h-4 mr-2 text-blue-600" /> Extras
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Personas Extras</label>
                      <input
                        type="number"
                        min="0"
                        value={personasExtras}
                        onChange={(e) => setPersonasExtras(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Horas Extras</label>
                      <input
                        type="number"
                        min="0"
                        value={horasExtras}
                        onChange={(e) => setHorasExtras(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Registro de Pagos */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center border-b border-gray-300 pb-2">
                    <DollarSign className="w-4 h-4 mr-2 text-emerald-600" /> Facturas y Pagos
                  </h4>
                  <div className="space-y-4">
                    {/* Facturas */}
                    <div className="bg-white/60 p-3 rounded-2xl border border-white/50 mb-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nº Factura Base</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={facturaBase}
                            onChange={(e) => setFacturaBase(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                            placeholder="Ej: 12345"
                          />
                        </div>
                        {tieneExtras && (
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Nº Factura Extras</label>
                            <input
                              type="text"
                              maxLength={5}
                              value={facturaExtras}
                              onChange={(e) => setFacturaExtras(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all text-orange-600"
                              placeholder="Ej: 12346"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Abono */}
                    <div className="bg-white/60 p-3 rounded-2xl border border-white/50">
                      <h5 className="text-[10px] font-bold text-gray-800 uppercase mb-2">1. Abono Inicial</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Monto ($)</label>
                          <input
                            type="text"
                            value={formatInputMoney(abonoMonto)}
                            onChange={(e) => handleAmountChange(e, setAbonoMonto)}
                            className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Fecha</label>
                          <input
                            type="date"
                            value={abonoFecha}
                            onChange={(e) => setAbonoFecha(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pago Final */}
                    <div className="bg-white/60 p-3 rounded-2xl border border-white/50">
                      <h5 className="text-[10px] font-bold text-gray-800 uppercase mb-2">2. Saldo Base</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Monto ($)</label>
                          <input
                            type="text"
                            value={formatInputMoney(pagoFinalMonto)}
                            onChange={(e) => handleAmountChange(e, setPagoFinalMonto)}
                            className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Fecha</label>
                          <input
                            type="date"
                            value={pagoFinalFecha}
                            onChange={(e) => setPagoFinalFecha(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/90 border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pago Extras */}
                    {tieneExtras && (
                      <div className="bg-orange-50/60 p-3 rounded-2xl border border-orange-100 mb-4">
                        <h5 className="text-[10px] font-bold text-orange-800 uppercase mb-2">3. Pago Extras</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-orange-600 mb-1">Monto ($)</label>
                            <input
                              type="text"
                              value={formatInputMoney(pagoExtrasMonto)}
                              onChange={(e) => handleAmountChange(e, setPagoExtrasMonto)}
                              className="w-full px-3 py-2 rounded-lg bg-white/90 border border-orange-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-orange-600 mb-1">Fecha</label>
                            <input
                              type="date"
                              value={pagoExtrasFecha}
                              onChange={(e) => setPagoExtrasFecha(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white/90 border border-orange-200 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveAll}
                disabled={updating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex justify-center items-center transition-colors shadow-md"
              >
                <Save className="w-4 h-4 mr-2" /> 
                {updating ? 'Guardando...' : 'Guardar Ajustes y Pagos'}
              </button>
            </div>

            {/* Resumen Financiero */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/50">
              <h3 className="font-bold text-gray-800 mb-4">Resumen de Cobro</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Base ({selectedEvent.cantidad_personas} pax)</span>
                  <span>{formatMoney(baseTotal)}</span>
                </div>
                {(personasExtras > 0 || selectedEvent.estado === 'terminado') && (
                  <div className="flex justify-between text-gray-600">
                    <span>Personas Extras ({personasExtras} pax)</span>
                    <span>{formatMoney(personasExtrasTotal)}</span>
                  </div>
                )}
                {(horasExtras > 0 || selectedEvent.estado === 'terminado') && (
                  <div className="flex justify-between text-gray-600">
                    <span>Horas Extras ({horasExtras} hrs)</span>
                    <span>{formatMoney(horasExtrasTotal)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total Final</span>
                  <span className="text-xl font-bold text-gray-900">{formatMoney(granTotal)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Pagado</span>
                    <span className="font-semibold">{formatMoney(totalPagado)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-800">Saldo Pendiente</span>
                    <span className={`text-lg font-black ${saldoPendiente <= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatMoney(saldoPendiente)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
