import { neon } from '@neondatabase/serverless';

// Función para obtener la conexión a la base de datos
export const getDb = () => {
  const databaseUrl = process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('NETLIFY_DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
};

// Función mejorada para inicializar la base de datos
export const initializeDatabase = async () => {
  const sql = getDb();
  
  try {
    console.log('Iniciando inicialización de la base de datos...');
    
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
          console.log(`Regalo insertado: ${gift.item}`);
        } catch (error) {
          console.error(`Error insertando regalo "${gift.item}":`, error);
        }
      }
      
      console.log('Datos iniciales insertados exitosamente.');
    } else {
      console.log('La tabla ya contiene datos. No se insertaron datos iniciales.');
    }
    
    return true;
  } catch (error) {
    console.error('Error crítico en initializeDatabase:', error);
    throw error;
  }
};

// Función para obtener todos los regalos
export const getAllGifts = async () => {
  const sql = getDb();
  
  try {
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
    
    return result;
  } catch (error) {
    console.error('Error al obtener regalos:', error);
    throw error;
  }
};