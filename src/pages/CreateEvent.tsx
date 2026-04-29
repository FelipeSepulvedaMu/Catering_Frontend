import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ArrowLeft, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { addHours, format, parse } from 'date-fns';
import { fetchApi } from '../lib/api';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Option {
  value: string;
  label: string;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function MapUpdater({ position }: { position: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [productoras, setProductoras] = useState<Option[]>([]);
  const [contactos, setContactos] = useState<Option[]>([]);
  
  const [selectedProductora, setSelectedProductora] = useState<Option | null>(null);
  const [selectedContacto, setSelectedContacto] = useState<Option | null>(null);
  const [direccion, setDireccion] = useState('');
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [fecha, setFecha] = useState('');
  const [valorPersona, setValorPersona] = useState('');
  const [valorHoraExtra, setValorHoraExtra] = useState('');
  const [cantidadPersonas, setCantidadPersonas] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductoras();
    fetchContactos();
  }, []);

  const fetchProductoras = async () => {
    try {
      const res = await fetchApi('/api/productoras');
      const data = await res.json();
      setProductoras(data.map((p: any) => ({ value: p.id.toString(), label: p.nombre })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContactos = async () => {
    try {
      const res = await fetchApi('/api/contactos');
      const data = await res.json();
      setContactos(data.map((c: any) => ({ value: c.id.toString(), label: c.nombre })));
    } catch (e) {
      console.error(e);
    }
  };

  // Geocoding effect
  useEffect(() => {
    if (!direccion || direccion.length < 5) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Append Chile to improve local results
        const query = encodeURIComponent(`${direccion}, Chile`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setPosition(new L.LatLng(parseFloat(lat), parseFloat(lon)));
        }
      } catch (error) {
        console.error("Error geocoding:", error);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [direccion]);

  const handleCreateProductora = async (inputValue: string) => {
    try {
      const res = await fetchApi('/api/productoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: inputValue })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Productora creada exitosamente');
        const newOption = { value: data.id.toString(), label: data.nombre };
        setProductoras(prev => [...prev, newOption]);
        setSelectedProductora(newOption);
      } else {
        toast.error(data.error || 'Error al crear productora');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleCreateContacto = async (inputValue: string) => {
    try {
      const res = await fetchApi('/api/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: inputValue })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Contacto creado exitosamente');
        const newOption = { value: data.id.toString(), label: data.nombre };
        setContactos(prev => [...prev, newOption]);
        setSelectedContacto(newOption);
      } else {
        toast.error(data.error || 'Error al crear contacto');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleHoraEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHoraEntrada(val);
    if (val) {
      const parsedTime = parse(val, 'HH:mm', new Date());
      const outTime = addHours(parsedTime, 11);
      setHoraSalida(format(outTime, 'HH:mm'));
    } else {
      setHoraSalida('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductora || !selectedContacto || !fecha || !valorPersona || !valorHoraExtra || !cantidadPersonas) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productora_id: parseInt(selectedProductora.value),
          contacto_id: parseInt(selectedContacto.value),
          direccion,
          lat: position?.lat,
          lng: position?.lng,
          hora_entrada: horaEntrada,
          hora_salida: horaSalida,
          fecha,
          valor_por_persona: parseInt(valorPersona),
          valor_hora_extra: parseInt(valorHoraExtra),
          cantidad_personas: parseInt(cantidadPersonas)
        })
      });
      
      if (res.ok) {
        toast.success('Evento agendado exitosamente');
        navigate('/');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear evento');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Default center: Santiago, Chile
  const defaultCenter: [number, number] = [-33.4489, -70.6693];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4 max-w-3xl mx-auto w-full">
          <button onClick={() => navigate('/')} className="p-2 mr-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Agendar Evento</h1>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6 bg-[#DDDADA]/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/50">
          
          {/* Productora */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Productora <span className="text-red-500">*</span></label>
            <CreatableSelect
              isClearable
              options={productoras}
              value={selectedProductora}
              onChange={(newValue) => setSelectedProductora(newValue)}
              onCreateOption={handleCreateProductora}
              placeholder="Seleccionar o crear productora..."
              formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          {/* Contacto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contacto <span className="text-red-500">*</span></label>
            <CreatableSelect
              isClearable
              options={contactos}
              value={selectedContacto}
              onChange={(newValue) => setSelectedContacto(newValue)}
              onCreateOption={handleCreateContacto}
              placeholder="Seleccionar o crear contacto..."
              formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="Escribe la dirección..."
              />
            </div>
            <div className="h-48 rounded-xl overflow-hidden border border-gray-300 z-0 relative">
              <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker position={position} setPosition={setPosition} />
                <MapUpdater position={position} />
              </MapContainer>
            </div>
            <p className="text-xs text-gray-500 mt-1">El mapa se actualizará automáticamente. Toca para ajustar (opcional).</p>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha del Evento <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hora Entrada</label>
              <input
                type="time"
                value={horaEntrada}
                onChange={handleHoraEntradaChange}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hora Salida</label>
              <input
                type="time"
                value={horaSalida}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100/80 text-gray-500 outline-none"
                title="Calculado automáticamente (11 horas)"
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valor por Persona <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={valorPersona}
                  onChange={(e) => setValorPersona(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Ej: 15000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Hora Extra <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={valorHoraExtra}
                  onChange={(e) => setValorHoraExtra(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Ej: 1500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cant. Personas <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                step="1"
                value={cantidadPersonas}
                onChange={(e) => setCantidadPersonas(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="Ej: 50"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg shadow-md transition-colors disabled:opacity-70"
            >
              {loading ? 'Guardando...' : 'Agendar Evento'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
