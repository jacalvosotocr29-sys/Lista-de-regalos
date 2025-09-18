import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import { getDb, initializeDatabase } from './db';

const App = () => {
  // Configuración
  const CODIGO_COMPARTIDO = "cafecito";
  const CODIGO_ADMIN = "CÓDIGO_ADMIN";
  const MONEDA = "CRC";
  const NOMBRES = "Mauren & Jose Andrés";
  const FECHA = "18 de octubre";

  // Estados
  const [currentPage, setCurrentPage] = useState('home');
  const [accessCode, setAccessCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [userRole, setUserRole] = useState(null); // 'guest' o 'admin'
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('available');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState(null);
  const [purchaserName, setPurchaserName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Efecto para inicializar la base de datos y cargar los datos
  useEffect(() => {
    const initAndLoadData = async () => {
      try {
        // Inicializar la base de datos
        await initializeDatabase();
        
        // Cargar los regalos desde la base de datos
        const sql = getDb();
        const loadedGifts = await sql`
          SELECT 
            id,
            store,
            store_link as "storeLink",
            item,
            description,
            quantity,
            price,
            status,
            purchased_at as "purchasedAt",
            purchaser_name as "purchaserName",
            image_url as "imageUrl"
          FROM gifts
          ORDER BY id
        `;
        
        setGifts(loadedGifts);
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMessage('Error al cargar los datos. Por favor, recarga la página.');
      } finally {
        setLoading(false);
      }
    };
    
    initAndLoadData();
  }, []);

  // Efecto para limpiar mensajes
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Función para cerrar sesión
  const handleLogout = () => {
    setUserRole(null);
    setCurrentPage('home');
    setAccessCode('');
    setAdminCode('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Funciones de acceso
  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (accessCode === CODIGO_COMPARTIDO) {
      setUserRole('guest');
      setCurrentPage('gifts');
    } else if (accessCode === CODIGO_ADMIN) {
      setUserRole('admin');
      setCurrentPage('admin');
    } else {
      setErrorMessage('Código inválido. Inténtalo de nuevo.');
    }
  };

  // Funciones para la lista de regalos
  const handlePurchaseClick = (giftId) => {
    const gift = gifts.find(g => g.id === giftId);
    if (gift.status === "Ya fue comprado") {
      setErrorMessage('Este artículo ya fue comprado por otra persona.');
      return;
    }
    setSelectedGiftId(giftId);
    setShowConfirmModal(true);
  };

  const confirmPurchase = async () => {
    try {
      const sql = getDb();
      
      // Actualizar el regalo en la base de datos
      const result = await sql`
        UPDATE gifts 
        SET 
          status = 'Ya fue comprado',
          purchased_at = ${new Date().toISOString()},
          purchaser_name = ${purchaserName || ''}
        WHERE id = ${selectedGiftId} AND status = 'Aún disponible'
        RETURNING *
      `;
      
      if (result.length === 0) {
        // Alguien más ya compró este regalo
        setErrorMessage('Este artículo ya fue comprado por otra persona.');
        return;
      }
      
      // Actualizar el estado local
      setGifts(prevGifts => 
        prevGifts.map(gift => 
          gift.id === selectedGiftId ? {
            ...gift,
            status: "Ya fue comprado",
            purchasedAt: new Date().toISOString(),
            purchaserName: purchaserName || ""
          } : gift
        )
      );
      
      setShowConfirmModal(false);
      setPurchaserName('');
      setSuccessMessage('¡Gracias por tu regalo! Este artículo ya no aparecerá como disponible.');
      setTimeout(() => {
        setCurrentPage('thankYou');
      }, 2000);
    } catch (error) {
      console.error('Error purchasing gift:', error);
      setErrorMessage('Error al marcar el regalo como comprado. Por favor, inténtalo de nuevo.');
    }
  };

  // Funciones de administración
  const handleAdminAccess = (e) => {
    e.preventDefault();
    if (adminCode === CODIGO_ADMIN) {
      setUserRole('admin');
      setCurrentPage('admin');
    } else {
      setErrorMessage('Código de administrador inválido.');
    }
  };

  const addNewGift = async () => {
    try {
      const sql = getDb();
      
      // Insertar nuevo regalo en la base de datos
      const newGift = {
        store: "",
        storeLink: "",
        item: "",
        description: "",
        quantity: 1,
        price: 0,
        status: "Aún disponible",
        purchasedAt: null,
        purchaserName: "",
        imageUrl: ""
      };
      
      const result = await sql`
        INSERT INTO gifts (
          store, store_link, item, description, quantity, price, status, purchased_at, purchaser_name, image_url
        ) VALUES (
          ${newGift.store}, ${newGift.storeLink}, ${newGift.item}, ${newGift.description}, 
          ${newGift.quantity}, ${newGift.price}, ${newGift.status}, ${newGift.purchasedAt}, 
          ${newGift.purchaserName}, ${newGift.imageUrl}
        )
        RETURNING *
      `;
      
      // Actualizar el estado local
      setGifts(prevGifts => [...prevGifts, result[0]]);
      
      setSuccessMessage('Nuevo regalo agregado exitosamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding new gift:', error);
      setErrorMessage('Error al agregar el nuevo regalo. Por favor, inténtalo de nuevo.');
    }
  };

  const updateGift = async (id, field, value) => {
    try {
      const sql = getDb();
      const dbField = field === 'storeLink' ? 'store_link' : 
                     field === 'purchasedAt' ? 'purchased_at' : 
                     field === 'purchaserName' ? 'purchaser_name' : 
                     field === 'imageUrl' ? 'image_url' : field;
      
      // Actualizar el campo en la base de datos
      await sql`
        UPDATE gifts 
        SET ${sql(field)} = ${value}
        WHERE id = ${id}
      `;
      
      // Actualizar el estado local
      setGifts(prevGifts => 
        prevGifts.map(gift => 
          gift.id === id ? {...gift, [field]: value} : gift
        )
      );
    } catch (error) {
      console.error('Error updating gift:', error);
      setErrorMessage('Error al actualizar el regalo. Por favor, inténtalo de nuevo.');
    }
  };

  const deleteGift = async (id) => {
    try {
      const sql = getDb();
      
      // Eliminar el regalo de la base de datos
      await sql`
        DELETE FROM gifts 
        WHERE id = ${id}
      `;
      
      // Actualizar el estado local
      setGifts(prevGifts => prevGifts.filter(gift => gift.id !== id));
      
      setSuccessMessage('Regalo eliminado exitosamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting gift:', error);
      setErrorMessage('Error al eliminar el regalo. Por favor, inténtalo de nuevo.');
    }
  };

  const resetGiftStatus = async (id) => {
    try {
      const sql = getDb();
      
      // Reiniciar el estado del regalo en la base de datos
      await sql`
        UPDATE gifts 
        SET 
          status = 'Aún disponible',
          purchased_at = NULL,
          purchaser_name = ''
        WHERE id = ${id}
      `;
      
      // Actualizar el estado local
      setGifts(prevGifts => 
        prevGifts.map(gift => 
          gift.id === id ? {
            ...gift,
            status: "Aún disponible",
            purchasedAt: null,
            purchaserName: ""
          } : gift
        )
      );
      
      setSuccessMessage('Estado del regalo reiniciado exitosamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error resetting gift status:', error);
      setErrorMessage('Error al reiniciar el estado del regalo. Por favor, inténtalo de nuevo.');
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Tienda', 'Artículo', 'Descripción', 'Cantidad', 'Precio', 'Estado', 'Fecha de compra', 'Comprador', 'URL de Imagen'];
    const csvContent = [
      headers.join(','),
      ...gifts.map(gift => [
        gift.id,
        `"${gift.store}"`,
        `"${gift.item}"`,
        `"${gift.description}"`,
        gift.quantity,
        gift.price,
        `"${gift.status}"`,
        gift.purchasedAt || "",
        `"${gift.purchaserName}"`,
        `"${gift.imageUrl}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "lista_regalos_cafecito.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Componente Header con botón de salir
  const Header = ({ title, showLogout = true }) => {
    if (!showLogout) return null;
    
    return (
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-[#556B2F]">{title}</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm md:text-base"
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    );
  };

  // Renderizado de componentes
  const renderHome = () => (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-[#556B2F] mb-2">Lista de regalos cafecito {NOMBRES}</h1>
        <p className="text-gray-600 mb-6">¡Gracias por acompañarnos! Elige un regalo, márcalo como comprado y así evitamos duplicados.</p>
        
        <form onSubmit={handleAccessSubmit} className="space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
              Código de invitado
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073] focus:border-transparent"
              placeholder="Ingresa el código aquí"
              aria-label="Código de invitado"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#D07F5F] hover:bg-[#556B2F] text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Entrar
          </button>
        </form>
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm" role="alert" aria-live="assertive">
            {errorMessage}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Fecha del evento: {FECHA}
          </p>
        </div>
      </div>
    </div>
  );

  const renderGifts = () => {
    const filteredGifts = filter === 'available' 
      ? gifts.filter(g => g.status === "Aún disponible")
      : filter === 'purchased'
        ? gifts.filter(g => g.status === "Ya fue comprado")
        : gifts;

    if (loading) {
      return (
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6C073] mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando lista de regalos...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FFF8F0] pb-20">
        <Header title={`Lista de regalos cafecito ${NOMBRES}`} showLogout={userRole !== null} />
        
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-gray-600 mb-6">¡Gracias por acompañarnos! Elige un regalo, márcalo como comprado y así evitamos duplicados.</p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'available' 
                  ? 'bg-[#E6C073] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Aún disponible
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-[#E6C073] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('purchased')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'purchased' 
                  ? 'bg-[#E6C073] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ya fue comprado
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md" role="alert" aria-live="polite">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md" role="alert" aria-live="assertive">
              {errorMessage}
            </div>
          )}

          {filteredGifts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay artículos que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredGifts.map(gift => (
                <div key={gift.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  {gift.imageUrl && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.item}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/300x200/E6C073/FFFFFF?text=Sin+Imagen";
                        }}
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-800">{gift.item}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        gift.status === "Ya fue comprado" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {gift.status}
                      </span>
                    </div>
                    
                    {gift.description && (
                      <p className="text-gray-600 text-sm mb-3 italic">{gift.description}</p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">🛍️</span>
                        <span className="font-medium">Tienda:</span> 
                        {gift.storeLink ? (
                          <a href={gift.storeLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#D07F5F] hover:underline">
                            {gift.store}
                          </a>
                        ) : (
                          <span className="ml-1">{gift.store}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <span className="font-medium">Cantidad deseada:</span>
                        <span className="ml-1">{gift.quantity}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <span className="font-medium">Precio:</span>
                        <span className="ml-1">{MONEDA} {gift.price.toFixed(2)}</span>
                      </div>
                      
                      {gift.status === "Ya fue comprado" && gift.purchasedAt && (
                        <div className="flex items-center text-gray-500">
                          <span className="mr-1">🕒</span>
                          <span className="text-xs">
                            Comprado el {new Date(gift.purchasedAt).toLocaleDateString()} 
                            {gift.purchaserName && ` por ${gift.purchaserName}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {gift.status === "Aún disponible" && (
                      <button
                        onClick={() => handlePurchaseClick(gift.id)}
                        className="mt-4 w-full bg-[#D07F5F] hover:bg-[#556B2F] text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
                        aria-label={`Marcar ${gift.item} como comprado`}
                      >
                        Marcar como comprado
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">¿Confirmas que compraste este artículo?</h3>
              
              <div className="mb-4">
                <label htmlFor="purchaserName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (opcional)
                </label>
                <input
                  id="purchaserName"
                  type="text"
                  value={purchaserName}
                  onChange={(e) => setPurchaserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073] focus:border-transparent"
                  placeholder="Tu nombre (opcional)"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPurchase}
                  className="flex-1 px-4 py-2 bg-[#556B2F] text-white rounded-md hover:bg-[#D07F5F] transition-colors"
                >
                  Confirmar compra
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto text-center text-xs text-gray-500">
            <p>Aviso de privacidad: No recolectamos datos personales obligatorios. Tu nombre es opcional y solo se mostrará a los novios.</p>
            <p className="mt-1">© {new Date().getFullYear()} Lista de regalos cafecito {NOMBRES}</p>
          </div>
        </footer>
      </div>
    );
  };

  const renderAdmin = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E6C073] mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando panel de administración...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Header title={`Panel de Administración - Lista de regalos cafecito ${NOMBRES}`} showLogout={userRole !== null} />

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-8 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Gestión de Regalos</h2>
            <div className="flex space-x-3">
              <button
                onClick={addNewGift}
                className="px-4 py-2 bg-[#D07F5F] text-white rounded-md hover:bg-[#556B2F] transition-colors"
              >
                + Agregar Regalo
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-[#E6C073] text-white rounded-md hover:bg-[#556B2F] transition-colors"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {gifts.map(gift => (
              <div key={gift.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tienda</label>
                    <input
                      type="text"
                      value={gift.store}
                      onChange={(e) => updateGift(gift.id, 'store', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Tienda</label>
                    <input
                      type="text"
                      value={gift.storeLink}
                      onChange={(e) => updateGift(gift.id, 'storeLink', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Artículo</label>
                    <input
                      type="text"
                      value={gift.item}
                      onChange={(e) => updateGift(gift.id, 'item', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={gift.quantity}
                      onChange={(e) => updateGift(gift.id, 'quantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio ({MONEDA})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gift.price}
                      onChange={(e) => updateGift(gift.id, 'price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                    <input
                      type="text"
                      value={gift.imageUrl}
                      onChange={(e) => updateGift(gift.id, 'imageUrl', e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={gift.description}
                    onChange={(e) => updateGift(gift.id, 'description', e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6C073]"
                  />
                </div>
                
                {gift.imageUrl && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vista previa de la imagen</label>
                    <div className="border border-gray-300 rounded-md p-2 max-w-xs">
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.item}
                        className="w-full h-auto rounded-md"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/300x200/E6C073/FFFFFF?text=Imagen+No+Disponible";
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      gift.status === "Ya fue comprado" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {gift.status}
                    </span>
                    {gift.purchasedAt && (
                      <span className="ml-3 text-sm text-gray-500">
                        🕒 {new Date(gift.purchasedAt).toLocaleString()}
                        {gift.purchaserName && ` - ${gift.purchaserName}`}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => resetGiftStatus(gift.id)}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      Reiniciar a disponible
                    </button>
                    <button
                      onClick={() => deleteGift(gift.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-md hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage('Cambios guardados exitosamente para este regalo');
                        setTimeout(() => setSuccessMessage(''), 3000);
                      }}
                      className="px-3 py-1 bg-[#556B2F] text-white text-sm rounded-md hover:bg-[#D07F5F] transition-colors"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderThankYou = () => (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <Header title="¡Gracias por tu regalo!" showLogout={userRole !== null} />
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#E6C073] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#556B2F] mb-2">¡Muchas gracias!</h1>
          <p className="text-gray-600">Tu regalo ha sido registrado exitosamente. Los novios aprecian mucho tu gesto.</p>
        </div>
        
        <button
          onClick={() => setCurrentPage('gifts')}
          className="w-full bg-[#D07F5F] hover:bg-[#556B2F] text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
        >
          Volver a la lista de regalos
        </button>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Fecha del evento: {FECHA}
          </p>
        </div>
      </div>
    </div>
  );

  // Render principal
  return (
    <div className="font-sans">
      {currentPage === 'home' && renderHome()}
      {currentPage === 'gifts' && renderGifts()}
      {currentPage === 'admin' && renderAdmin()}
      {currentPage === 'thankYou' && renderThankYou()}
    </div>
  );
};

// ¡ESTA PARTE ES LA CLAVE! Aquí montamos la aplicación en el DOM.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;