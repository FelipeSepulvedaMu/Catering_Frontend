import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, DollarSign, TrendingUp, Users, Clock, CheckCircle2, XCircle, AlertCircle, Save } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';

export default function Reportes() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default to current month
  const [fechaDesde, setFechaDesde] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Payment Modal States
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<any>(null);
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoFecha, setAbonoFecha] = useState('');
  const [pagoFinalMonto, setPagoFinalMonto] = useState(0);
  const [pagoFinalFecha, setPagoFinalFecha] = useState('');
  const [facturaBase, setFacturaBase] = useState('');
  const [facturaExtras, setFacturaExtras] = useState('');
  const [pagoExtrasMonto, setPagoExtrasMonto] = useState(0);
  const [pagoExtrasFecha, setPagoExtrasFecha] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

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

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const formatInputMoney = (amount: number) => {
    if (amount === 0) return '';
    return new Intl.NumberFormat('es-CL').format(amount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setter(rawValue ? parseInt(rawValue, 10) : 0);
  };

  const openPaymentModal = (evento: any) => {
    setSelectedEventForPayment(evento);
    setAbonoMonto(evento.abono_monto || 0);
    setAbonoFecha(evento.abono_fecha?.split('T')[0] || '');
    setPagoFinalMonto(evento.pago_final_monto || 0);
    setPagoFinalFecha(evento.pago_final_fecha?.split('T')[0] || '');
    setFacturaBase(evento.factura_base || '');
    setFacturaExtras(evento.factura_extras || '');
    setPagoExtrasMonto(evento.pago_extras_monto || 0);
    setPagoExtrasFecha(evento.pago_extras_fecha?.split('T')[0] || '');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForPayment) return;

    const baseTotal = selectedEventForPayment.totales.base || 0;
    const extrasTotal = (selectedEventForPayment.totales.pExtras || 0) + (selectedEventForPayment.totales.hExtras || 0);

    if (abonoMonto + pagoFinalMonto > baseTotal) {
      toast.error('El abono y pago base superan el monto de la factura base');
      return;
    }

    if (pagoExtrasMonto > extrasTotal) {
      toast.error('El pago de extras supera el monto de la factura extras');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetchApi(`/api/eventos/${selectedEventForPayment.id}/pagos`, {
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
      });

      if (res.ok) {
        toast.success('Pagos actualizados');
        fetchEventos();
        setSelectedEventForPayment(null);
      } else {
        toast.error('Error al actualizar pagos');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSavingPayment(false);
    }
  };

  // Filter events by date range
  const eventosFiltrados = eventos.filter(evento => {
    if (!fechaDesde || !fechaHasta) return true;
    try {
      const eventDate = parseISO(evento.fecha);
      const start = parseISO(fechaDesde);
      const end = parseISO(fechaHasta);
      return isWithinInterval(eventDate, { start, end });
    } catch (e) {
      return false;
    }
  });

  // Calculate totals
  let totalRecaudado = 0;
  let totalGastos = 0;
  let totalGanancia = 0;

  let trabajosRealizados = 0;
  let eventosCancelados = 0;
  let eventosPagados = 0;
  let eventosAbonados = 0;
  let eventosImpagos = 0;

  const eventosConTotales = eventosFiltrados.map(evento => {
    const valorPP = Number(evento.valor_por_persona) || 0;
    const cantBase = Number(evento.cantidad_personas) || 0;
    const pExtras = Number(evento.personas_extras) || 0;
    const hExtras = Number(evento.horas_extras) || 0;
    
    const totalPersonas = cantBase + pExtras;
    const valorHoraExtraPP = Number(evento.valor_hora_extra) || 0;

    const eBase = valorPP * cantBase;
    const ePExtras = valorPP * pExtras;
    const eHExtras = valorHoraExtraPP * totalPersonas * hExtras;
    const eTotal = eBase + ePExtras + eHExtras;
    const eGastos = Number(evento.total_gastos) || 0;
    const eGanancia = eTotal - eGastos;

    const abono = Number(evento.abono_monto) || 0;
    const pagoFinal = Number(evento.pago_final_monto) || 0;
    const pagoExtras = Number(evento.pago_extras_monto) || 0;
    const totalPagado = abono + pagoFinal + pagoExtras;
    const saldo = eTotal - totalPagado;

    if (evento.estado === 'terminado') {
      trabajosRealizados++;
      totalRecaudado += eTotal;
      totalGastos += eGastos;
      totalGanancia += eGanancia;
    } else if (evento.estado === 'cancelado') {
      eventosCancelados++;
    }

    // Pagos count (solo para eventos no cancelados)
    if (evento.estado !== 'cancelado') {
      if (saldo <= 0) {
        eventosPagados++;
      } else if (totalPagado > 0) {
        eventosAbonados++;
      } else {
        eventosImpagos++;
      }
    }

    return {
      ...evento,
      totales: { base: eBase, pExtras: ePExtras, hExtras: eHExtras, total: eTotal, gastos: eGastos, ganancia: eGanancia, totalPersonas },
      cantidades: { base: cantBase, pExtras, hExtras },
      pagos: {
        abono,
        pagoFinal,
        pagoExtras,
        totalPagado,
        saldo
      }
    };
  });

  // Para la lista de desglose, mostramos solo los terminados (o los que no están cancelados)
  // Como es un reporte financiero, mostraremos solo los terminados
  const eventosTerminados = eventosConTotales.filter(e => e.estado === 'terminado');

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4 max-w-5xl mx-auto w-full">
          <button onClick={() => navigate('/')} className="p-2 mr-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Reportes</h1>
        </div>
        
        {/* Filtros de Fecha */}
        <div className="px-4 pb-4 max-w-5xl mx-auto w-full">
          <div className="bg-gray-100 p-3 rounded-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 shrink-0" />
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Desde</label>
                <input 
                  type="date" 
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none"
                />
              </div>
              <div className="w-px h-8 bg-gray-300 shrink-0"></div>
              <div className="flex-1 pl-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Hasta</label>
                <input 
                  type="date" 
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando datos...</div>
        ) : (
          <>
            <div className="space-y-8">
              {/* Tarjetas de Resumen Rápido */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-3xl text-white shadow-md flex md:flex-col justify-between md:justify-center items-center md:items-start gap-2">
                  <div className="flex items-center gap-2 opacity-90">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Recaudado Total</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black">{formatMoney(totalRecaudado)}</div>
                </div>
                
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-3xl text-white shadow-md flex md:flex-col justify-between md:justify-center items-center md:items-start gap-2">
                  <div className="flex items-center gap-2 opacity-90">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Gastos Totales</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black">{formatMoney(totalGastos)}</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-5 rounded-3xl text-white shadow-md flex md:flex-col justify-between md:justify-center items-center md:items-start gap-2">
                  <div className="flex items-center gap-2 opacity-90">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Ganancia Neta</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black">{formatMoney(totalGanancia)}</div>
                </div>
              </div>

              {/* Resumen de Operaciones */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800 text-lg">Estado de Eventos</h3>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="text-3xl font-black text-blue-600 mb-1">{trabajosRealizados}</span>
                    <span className="text-xs font-bold text-blue-800 uppercase text-center">Realizados</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-2xl border border-red-100">
                    <span className="text-3xl font-black text-red-600 mb-1">{eventosCancelados}</span>
                    <span className="text-xs font-bold text-red-800 uppercase text-center">Cancelados</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-3xl font-black text-emerald-600 mb-1">{eventosPagados}</span>
                    <span className="text-xs font-bold text-emerald-800 uppercase text-center">Pagados</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <span className="text-3xl font-black text-orange-600 mb-1">{eventosAbonados}</span>
                    <span className="text-xs font-bold text-orange-800 uppercase text-center">Abonados</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-2xl border border-gray-200 col-span-2 md:col-span-1">
                    <span className="text-3xl font-black text-gray-600 mb-1">{eventosImpagos}</span>
                    <span className="text-xs font-bold text-gray-800 uppercase text-center">Impagos</span>
                  </div>
                </div>
              </div>

              {/* Lista de Eventos con Desglose */}
              <div>
                <h3 className="font-bold text-gray-800 mb-4 px-1 text-lg">Desglose por Evento (Realizados)</h3>
                {eventosTerminados.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-3xl border border-gray-200 text-gray-500">
                    No hay eventos finalizados en este periodo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eventosTerminados.map(evento => (
                      <div 
                        key={evento.id} 
                        onClick={() => evento.pagos.saldo > 0 ? openPaymentModal(evento) : null}
                        className={`bg-white p-5 rounded-3xl shadow-sm border flex flex-col ${evento.pagos.saldo > 0 ? 'border-orange-200 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-gray-800 text-lg">{evento.productora_nombre}</h4>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span className="capitalize">{format(parseISO(evento.fecha), "d MMM yyyy", { locale: es })}</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div 
                              className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                evento.pagos.saldo <= 0 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : evento.pagos.totalPagado > 0 
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'bg-orange-50 text-orange-600 border-orange-200'
                              }`}
                            >
                              {evento.pagos.saldo <= 0 ? (
                                <><CheckCircle2 className="w-3 h-3" /> PAGADA</>
                              ) : evento.pagos.totalPagado > 0 ? (
                                <><AlertCircle className="w-3 h-3" /> ABONADA</>
                              ) : (
                                <><XCircle className="w-3 h-3" /> IMPAGA</>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Desglose Interno del Evento */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2 text-sm border border-gray-100 flex-1">
                          <div className="flex justify-between text-gray-600 items-center">
                            <span>Base <span className="text-xs text-gray-400">({evento.cantidades.base} pax)</span></span>
                            <span className="font-medium text-gray-800">{formatMoney(evento.totales.base)}</span>
                          </div>
                          {evento.cantidades.pExtras > 0 && (
                            <div className="flex justify-between text-gray-600 items-center">
                              <span>Personas Extras <span className="text-xs text-gray-400">({evento.cantidades.pExtras} pax)</span></span>
                              <span className="font-medium text-gray-800">{formatMoney(evento.totales.pExtras)}</span>
                            </div>
                          )}
                          {evento.cantidades.hExtras > 0 && (
                            <div className="flex justify-between text-gray-600 items-center">
                              <span>Horas Extras <span className="text-xs text-gray-400">({evento.cantidades.hExtras} hrs)</span></span>
                              <span className="font-medium text-gray-800">{formatMoney(evento.totales.hExtras)}</span>
                            </div>
                          )}
                          
                          <div className="pt-2 mt-2 border-t border-gray-200">
                            {evento.factura_base && (
                              <div className="flex justify-between text-gray-500 items-center text-xs">
                                <span>Factura Base</span>
                                <span className="font-medium">Nº {evento.factura_base}</span>
                              </div>
                            )}
                            {evento.factura_extras && (
                              <div className="flex justify-between text-gray-500 items-center text-xs">
                                <span>Factura Extras</span>
                                <span className="font-medium">Nº {evento.factura_extras}</span>
                              </div>
                            )}
                            {evento.pagos.abono > 0 && (
                              <div className="flex justify-between text-orange-600 items-center mt-1">
                                <span>Abono Inicial</span>
                                <span className="font-medium">{formatMoney(evento.pagos.abono)}</span>
                              </div>
                            )}
                            {evento.pagos.pagoFinal > 0 && (
                              <div className="flex justify-between text-emerald-600 items-center">
                                <span>Pago Saldo Base</span>
                                <span className="font-medium">{formatMoney(evento.pagos.pagoFinal)}</span>
                              </div>
                            )}
                            {evento.pagos.pagoExtras > 0 && (
                              <div className="flex justify-between text-blue-600 items-center">
                                <span>Pago Extras</span>
                                <span className="font-medium">{formatMoney(evento.pagos.pagoExtras)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-gray-800 items-center mt-2 font-bold text-[13px] bg-white p-2 rounded-lg shadow-sm">
                              <span>Total Pagado</span>
                              <span className={evento.pagos.saldo <= 0 ? 'text-emerald-600' : ''}>{formatMoney(evento.pagos.totalPagado)}</span>
                            </div>
                            {evento.pagos.saldo > 0 && (
                              <div className="flex justify-between text-red-500 items-center mt-1 px-2 font-bold text-[13px]">
                                <span>Saldo Pendiente</span>
                                <span>{formatMoney(evento.pagos.saldo)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Totales del evento */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Recaudado</p>
                            <p className="text-sm font-bold text-emerald-600">{formatMoney(evento.totales.total)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Gastos</p>
                            <p className="text-sm font-bold text-red-500">-{formatMoney(evento.totales.gastos)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Ganancia</p>
                            <p className="text-sm font-black text-indigo-600">{formatMoney(evento.totales.ganancia)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedEventForPayment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedEventForPayment(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-10 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 flex justify-between items-center text-white shrink-0">
                <div>
                  <h3 className="text-xl font-bold">Actualizar Pagos</h3>
                  <p className="text-sm text-emerald-50 mt-1 opacity-90">{selectedEventForPayment.productora_nombre}</p>
                </div>
                <button 
                  onClick={() => setSelectedEventForPayment(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-md"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="p-6 overflow-y-auto space-y-6">
                
                {/* Facturas */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-indigo-800 text-sm flex items-center border-b border-indigo-100 pb-2">
                    <DollarSign className="w-4 h-4 mr-1 text-indigo-600" /> Facturación
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-indigo-700 mb-1">Nº Factura Base</label>
                      <input
                        type="text"
                        value={facturaBase}
                        onChange={(e) => setFacturaBase(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800 shadow-inner"
                        placeholder="Ej: 1234"
                      />
                      <div className="mt-2 p-2 bg-indigo-100/50 rounded-lg flex justify-between items-center border border-indigo-50">
                        <span className="text-[10px] text-indigo-600 font-bold uppercase">Monto</span>
                        <span className="text-sm font-bold text-indigo-900">
                          {formatMoney(selectedEventForPayment?.totales?.base || 0)}
                        </span>
                      </div>
                    </div>
                    {((selectedEventForPayment?.cantidades?.pExtras || 0) > 0 || (selectedEventForPayment?.cantidades?.hExtras || 0) > 0) && (
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">Nº Factura Extras</label>
                        <input
                          type="text"
                          value={facturaExtras}
                          onChange={(e) => setFacturaExtras(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800 shadow-inner"
                          placeholder="Ej: 1235"
                        />
                        <div className="mt-2 p-2 bg-indigo-100/50 rounded-lg flex justify-between items-center border border-indigo-50">
                          <span className="text-[10px] text-indigo-600 font-bold uppercase">Monto</span>
                          <span className="text-sm font-bold text-indigo-900">
                            {formatMoney((selectedEventForPayment?.totales?.pExtras || 0) + (selectedEventForPayment?.totales?.hExtras || 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagos */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-emerald-800 text-sm flex items-center border-b border-emerald-100 pb-2">
                    <DollarSign className="w-4 h-4 mr-1 text-emerald-600" /> Registro de Pagos
                  </h4>
                  
                  {/* Abono Inicial */}
                  <div className="space-y-2 bg-white/60 p-3 rounded-xl border border-emerald-50">
                    <p className="text-xs font-bold text-emerald-800">1. Abono Inicial</p>
                    <div className="flex gap-2">
                      <div className="w-1/2">
                        <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Monto ($)</label>
                        <input
                          type="text"
                          value={formatInputMoney(abonoMonto)}
                          onChange={(e) => handleAmountChange(e, setAbonoMonto)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-800 shadow-inner"
                          placeholder="0"
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Fecha</label>
                        <input
                          type="date"
                          value={abonoFecha}
                          onChange={(e) => setAbonoFecha(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pago Base */}
                  <div className="space-y-2 bg-white/60 p-3 rounded-xl border border-emerald-50">
                    <p className="text-xs font-bold text-emerald-800">2. Pago Saldo Base</p>
                    <div className="flex gap-2">
                      <div className="w-1/2">
                        <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Monto ($)</label>
                        <input
                          type="text"
                          value={formatInputMoney(pagoFinalMonto)}
                          onChange={(e) => handleAmountChange(e, setPagoFinalMonto)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-800 shadow-inner"
                          placeholder="0"
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Fecha</label>
                        <input
                          type="date"
                          value={pagoFinalFecha}
                          onChange={(e) => setPagoFinalFecha(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pago Extras */}
                  {((selectedEventForPayment?.cantidades?.pExtras || 0) > 0 || (selectedEventForPayment?.cantidades?.hExtras || 0) > 0) && (
                    <div className="space-y-2 bg-white/60 p-3 rounded-xl border border-emerald-50">
                      <p className="text-xs font-bold text-emerald-800">3. Pago Extras</p>
                      <div className="flex gap-2">
                        <div className="w-1/2">
                          <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Monto ($)</label>
                          <input
                            type="text"
                            value={formatInputMoney(pagoExtrasMonto)}
                            onChange={(e) => handleAmountChange(e, setPagoExtrasMonto)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-800 shadow-inner"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="block text-[10px] text-emerald-600 mb-1 font-semibold">Fecha</label>
                          <input
                            type="date"
                            value={pagoExtrasFecha}
                            onChange={(e) => setPagoExtrasFecha(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="flex gap-3 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedEventForPayment(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center transition-colors shadow-md disabled:bg-emerald-400"
                  >
                    {savingPayment ? 'Guardando...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> Guardar Pagos
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
