import { neon } from '@neondatabase/serverless';

// Función para obtener la conexión a la base de datos
export const getDb = () => {
  try {
    // Primero intentamos obtener la URL de la base de datos desde la variable de entorno de Vite
    let databaseUrl = import.meta.env.VITE_NETLIFY_DATABASE_URL;
    
    // Si no está definida, intentamos con la variable de entorno original
    if (!databaseUrl) {
      databaseUrl = process.env.NETLIFY_DATABASE_URL;
    }
    
    // Si aún no está definida, mostramos un error
    if (!databaseUrl) {
      console.warn('❌ Ni VITE_NETLIFY_DATABASE_URL ni NETLIFY_DATABASE_URL están definidas.');
      return null;
    }
    
    console.log('✅ URL de la base de datos obtenida correctamente');
    
    // Crear la conexión con opciones específicas para Neon
    const sql = neon(databaseUrl, {
      // Configuración para manejar la conexión SSL correctamente
      ssl: {
        rejectUnauthorized: false // Necesario para algunas conexiones con Neon
      },
      // Opciones adicionales para mejorar la estabilidad
      connection: {
        statement_timeout: 5000, // 5 segundos de timeout
        query_timeout: 5000
      }
    });
    
    console.log('✅ Conexión a la base de datos configurada correctamente.');
    return sql;
  } catch (error) {
    console.error('❌ Error al crear la conexión a la base de datos:', error);
    return null;
  }
};

// Función para probar la conexión a la base de datos
export const testDatabaseConnection = async () => {
  try {
    const sql = getDb();
    if (!sql) {
      return { success: false, message: 'No se pudo establecer conexión con la base de datos.' };
    }
    
    // Realizar una consulta simple para probar la conexión
    console.log('Probando conexión a la base de datos...');
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Prueba de conexión exitosa:', result);
    
    return { 
      success: true, 
      message: `✅ Conexión exitosa! Hora del servidor: ${new Date(result[0].current_time).toLocaleString()}` 
    };
  } catch (error) {
    console.error('Error al probar la conexión a la base de datos:', error);
    return { 
      success: false, 
      message: `❌ Error: ${error.message}. URL: ${process.env.NETLIFY_DATABASE_URL ? 'Presente' : 'Ausente'}`
    };
  }
};

// Función mejorada para inicializar la base de datos
export const initializeDatabase = async () => {
  try {
    console.log('Iniciando inicialización de la base de datos...');
    
    const sql = getDb();
    if (!sql) {
      console.warn('No se pudo establecer conexión con la base de datos. Usando datos de respaldo.');
      return false;
    }
    
    console.log('Creando tabla si no existe...');
    
    // Crear tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        store TEXT NOT NULL,
        store_link TEXT,
        item TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        status TEXT NOT NULL DEFAULT 'Aún disponible',
        purchased_at TIMESTAMP,
        purchaser_name TEXT,
        image_url TEXT
      )
    `;
    
    console.log('Tabla gifts creada o verificada.');
    
    // Verificar si la tabla está vacía
    console.log('Verificando si la tabla está vacía...');
    const countResult = await sql`SELECT COUNT(*) as count FROM gifts`;
    const count = parseInt(countResult[0].count);
    
    console.log(`Número de registros en la tabla: ${count}`);
    
    // Insertar datos iniciales solo si la tabla está vacía
    if (count === 0) {
      console.log('Insertando datos iniciales...');
      
      const initialGifts = [
        {
          store: "Amazon",
          store_link: "https://amazon.com",
          item: "Juego de copas de cristal",
          description: "Para brindar en nuestra boda",
          quantity: 1,
          price: 45.99,
          status: "Aún disponible",
          purchased_at: null,
          purchaser_name: "",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Copas+de+Cristal"
        },
        {
          store: "Tienda local",
          store_link: "",
          item: "Set de sábanas premium",
          description: "Tamaño king, algodón egipcio",
          quantity: 1,
          price: 89.50,
          status: "Ya fue comprado",
          purchased_at: new Date("2024-01-15T10:30:00"),
          purchaser_name: "Ana",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Set+de+Sábanas"
        },
        {
          store: "Walmart",
          store_link: "https://walmart.com",
          item: "Cafetera Nespresso",
          description: "Con lechera integrada",
          quantity: 1,
          price: 199.99,
          status: "Aún disponible",
          purchased_at: null,
          purchaser_name: "",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Cafetera+Nespresso"
        },
        {
          store: "Linio",
          store_link: "https://linio.com",
          item: "Vajilla para 6 personas",
          description: "Porcelana blanca con detalles dorados",
          quantity: 1,
          price: 125.75,
          status: "Aún disponible",
          purchased_at: null,
          purchaser_name: "",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Vajilla"
        },
        {
          store: "Tienda departamental",
          store_link: "",
          item: "Plancha a vapor",
          description: "Con función vertical",
          quantity: 1,
          price: 65.25,
          status: "Aún disponible",
          purchased_at: null,
          purchaser_name: "",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Plancha+a+Vapor"
        },
        {
          store: "Etsy",
          store_link: "https://etsy.com",
          item: "Cuadro personalizado",
          description: "Retrato de la pareja en acuarela",
          quantity: 1,
          price: 78.50,
          status: "Ya fue comprado",
          purchased_at: new Date("2024-01-12T14:22:00"),
          purchaser_name: "Carlos",
          image_url: "https://placehold.co/300x200/E6C073/556B2F?text=Cuadro+Personalizado"
        }
      ];

      // Insertar cada regalo individualmente para mejor manejo de errores
      for (const gift of initialGifts) {
        try {
          console.log(`Insertando regalo: ${gift.item}`);
          await sql`
            INSERT INTO gifts (
              store, store_link, item, description, quantity, price, 
              status, purchased_at, purchaser_name, image_url
            ) VALUES (
              ${gift.store}, ${gift.store_link}, ${gift.item}, ${gift.description},
              ${gift.quantity}, ${gift.price}, ${gift.status}, ${gift.purchased_at},
              ${gift.purchaser_name}, ${gift.image_url}
            )
          `;
          console.log(`✓ Regalo insertado: ${gift.item}`);
        } catch (error) {
          console.error(`Error insertando regalo "${gift.item}":`, error);
        }
      }
      
      console.log('✓ Datos iniciales insertados exitosamente.');
    } else {
      console.log('✓ La tabla ya contiene datos. No se insertaron datos iniciales.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error crítico en initializeDatabase:', error);
    console.error('Detalles del error:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
};

// Función para obtener todos los regalos
export const getAllGifts = async () => {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('Usando datos de respaldo porque no hay conexión a la base de datos.');
      // Devolvemos los datos de respaldo
      return [
        {
          id: 1,
          store: "Amazon",
          storeLink: "https://amazon.com",
          item: "Juego de copas de cristal",
          description: "Para brindar en nuestra boda",
          quantity: 1,
          price: 45.99,
          status: "Aún disponible",
          purchasedAt: null,
          purchaserName: "",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Copas+de+Cristal"
        },
        {
          id: 2,
          store: "Tienda local",
          storeLink: "",
          item: "Set de sábanas premium",
          description: "Tamaño king, algodón egipcio",
          quantity: 1,
          price: 89.50,
          status: "Ya fue comprado",
          purchasedAt: "2024-01-15T10:30:00",
          purchaserName: "Ana",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Set+de+Sábanas"
        },
        {
          id: 3,
          store: "Walmart",
          storeLink: "https://walmart.com",
          item: "Cafetera Nespresso",
          description: "Con lechera integrada",
          quantity: 1,
          price: 199.99,
          status: "Aún disponible",
          purchasedAt: null,
          purchaserName: "",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Cafetera+Nespresso"
        },
        {
          id: 4,
          store: "Linio",
          storeLink: "https://linio.com",
          item: "Vajilla para 6 personas",
          description: "Porcelana blanca con detalles dorados",
          quantity: 1,
          price: 125.75,
          status: "Aún disponible",
          purchasedAt: null,
          purchaserName: "",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Vajilla"
        },
        {
          id: 5,
          store: "Tienda departamental",
          storeLink: "",
          item: "Plancha a vapor",
          description: "Con función vertical",
          quantity: 1,
          price: 65.25,
          status: "Aún disponible",
          purchasedAt: null,
          purchaserName: "",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Plancha+a+Vapor"
        },
        {
          id: 6,
          store: "Etsy",
          storeLink: "https://etsy.com",
          item: "Cuadro personalizado",
          description: "Retrato de la pareja en acuarela",
          quantity: 1,
          price: 78.50,
          status: "Ya fue comprado",
          purchasedAt: "2024-01-12T14:22:00",
          purchaserName: "Carlos",
          imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Cuadro+Personalizado"
        }
      ];
    }
    
    console.log('Obteniendo todos los regalos de la base de datos...');
    const result = await sql`
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
    
    console.log(`✓ Se obtuvieron ${result.length} regalos de la base de datos.`);
    return result;
  } catch (error) {
    console.error('❌ Error al obtener regalos:', error);
    console.error('Detalles del error:', error.message);
    // En caso de error, devolvemos los datos de respaldo
    return [
      {
        id: 1,
        store: "Amazon",
        storeLink: "https://amazon.com",
        item: "Juego de copas de cristal",
        description: "Para brindar en nuestra boda",
        quantity: 1,
        price: 45.99,
        status: "Aún disponible",
        purchasedAt: null,
        purchaserName: "",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Copas+de+Cristal"
      },
      {
        id: 2,
        store: "Tienda local",
        storeLink: "",
        item: "Set de sábanas premium",
        description: "Tamaño king, algodón egipcio",
        quantity: 1,
        price: 89.50,
        status: "Ya fue comprado",
        purchasedAt: "2024-01-15T10:30:00",
        purchaserName: "Ana",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Set+de+Sábanas"
      },
      {
        id: 3,
        store: "Walmart",
        storeLink: "https://walmart.com",
        item: "Cafetera Nespresso",
        description: "Con lechera integrada",
        quantity: 1,
        price: 199.99,
        status: "Aún disponible",
        purchasedAt: null,
        purchaserName: "",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Cafetera+Nespresso"
      },
      {
        id: 4,
        store: "Linio",
        storeLink: "https://linio.com",
        item: "Vajilla para 6 personas",
        description: "Porcelana blanca con detalles dorados",
        quantity: 1,
        price: 125.75,
        status: "Aún disponible",
        purchasedAt: null,
        purchaserName: "",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Vajilla"
      },
      {
        id: 5,
        store: "Tienda departamental",
        storeLink: "",
        item: "Plancha a vapor",
        description: "Con función vertical",
        quantity: 1,
        price: 65.25,
        status: "Aún disponible",
        purchasedAt: null,
        purchaserName: "",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Plancha+a+Vapor"
      },
      {
        id: 6,
        store: "Etsy",
        storeLink: "https://etsy.com",
        item: "Cuadro personalizado",
        description: "Retrato de la pareja en acuarela",
        quantity: 1,
        price: 78.50,
        status: "Ya fue comprado",
        purchasedAt: "2024-01-12T14:22:00",
        purchaserName: "Carlos",
        imageUrl: "https://placehold.co/300x200/E6C073/556B2F?text=Cuadro+Personalizado"
      }
    ];
  }
};

// Función para agregar un nuevo regalo
export const addNewGift = async (giftData) => {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('No hay conexión a la base de datos. No se puede agregar el regalo.');
      return null;
    }
    
    console.log('Agregando nuevo regalo a la base de datos...');
    const result = await sql`
      INSERT INTO gifts (
        store, store_link, item, description, quantity, price, status, purchased_at, purchaser_name, image_url
      ) VALUES (
        ${giftData.store}, ${giftData.storeLink}, ${giftData.item}, ${giftData.description}, 
        ${giftData.quantity}, ${giftData.price}, ${giftData.status}, ${giftData.purchasedAt}, 
        ${giftData.purchaserName}, ${giftData.imageUrl}
      )
      RETURNING *
    `;
    
    console.log('✓ Nuevo regalo agregado exitosamente:', result[0]);
    return result[0];
  } catch (error) {
    console.error('❌ Error al agregar nuevo regalo:', error);
    console.error('Detalles del error:', error.message);
    return null;
  }
};

// Función para actualizar un regalo
export const updateGift = async (id, field, value) => {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('No hay conexión a la base de datos. No se puede actualizar el regalo.');
      return null;
    }
    
    console.log(`Actualizando regalo ID: ${id}, campo: ${field}, valor: ${value}`);
    
    // Mapear los nombres de campos de JavaScript a SQL
    const fieldMap = {
      'storeLink': 'store_link',
      'purchasedAt': 'purchased_at',
      'purchaserName': 'purchaser_name',
      'imageUrl': 'image_url'
    };
    
    const dbField = fieldMap[field] || field;
    
    // Actualizar el campo en la base de datos
    const result = await sql`
      UPDATE gifts 
      SET ${sql(dbField)} = ${value}
      WHERE id = ${id}
      RETURNING *
    `;
    
    console.log('✓ Regalo actualizado exitosamente:', result[0]);
    return result[0];
  } catch (error) {
    console.error(`❌ Error al actualizar el regalo (ID: ${id}, campo: ${field}):`, error);
    console.error('Detalles del error:', error.message);
    throw error;
  }
};

// Función para eliminar un regalo
export const deleteGift = async (id) => {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('No hay conexión a la base de datos. No se puede eliminar el regalo.');
      return false;
    }
    
    console.log(`Eliminando regalo ID: ${id}`);
    await sql`
      DELETE FROM gifts 
      WHERE id = ${id}
    `;
    
    console.log('✓ Regalo eliminado exitosamente');
    return true;
  } catch (error) {
    console.error(`❌ Error al eliminar el regalo (ID: ${id}):`, error);
    console.error('Detalles del error:', error.message);
    throw error;
  }
};

// Función para reiniciar el estado de un regalo
export const resetGiftStatus = async (id) => {
  try {
    const sql = getDb();
    if (!sql) {
      console.warn('No hay conexión a la base de datos. No se puede reiniciar el estado del regalo.');
      return null;
    }
    
    console.log(`Reiniciando estado del regalo ID: ${id}`);
    const result = await sql`
      UPDATE gifts 
      SET 
        status = 'Aún disponible',
        purchased_at = NULL,
        purchaser_name = ''
      WHERE id = ${id}
      RETURNING *
    `;
    
    console.log('✓ Estado del regalo reiniciado exitosamente:', result[0]);
    return result[0];
  } catch (error) {
    console.error(`❌ Error al reiniciar el estado del regalo (ID: ${id}):`, error);
    console.error('Detalles del error:', error.message);
    throw error;
  }
};

// Hacer las funciones accesibles globalmente
window.addNewGift = addNewGift;
window.updateGift = updateGift;
window.deleteGift = deleteGift;
window.resetGiftStatus = resetGiftStatus;
window.testDatabaseConnection = testDatabaseConnection;
window.getDb = getDb;