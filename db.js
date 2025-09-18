import { neon } from '@netlify/neon';

// Función para inicializar la conexión a la base de datos
export const getDb = () => {
  return neon();
};

// Función para inicializar la tabla de regalos si no existe
export const initializeDatabase = async () => {
  const sql = getDb();
  
  try {
    // Crear tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        store TEXT NOT NULL,
        store_link TEXT,
        item TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'Aún disponible',
        purchased_at TIMESTAMP,
        purchaser_name TEXT,
        image_url TEXT
      )
    `;
    
    // Insertar datos iniciales solo si la tabla está vacía
    const count = await sql`SELECT COUNT(*) FROM gifts`;
    if (count[0].count === 0) {
      await sql`
        INSERT INTO gifts (store, store_link, item, description, quantity, price, status, purchased_at, purchaser_name, image_url) VALUES
        ('Amazon', 'https://amazon.com', 'Juego de copas de cristal', 'Para brindar en nuestra boda', 1, 45.99, 'Aún disponible', NULL, '', 'https://placehold.co/300x200/E6C073/556B2F?text=Copas+de+Cristal'),
        ('Tienda local', '', 'Set de sábanas premium', 'Tamaño king, algodón egipcio', 1, 89.50, 'Ya fue comprado', '2024-01-15T10:30:00', 'Ana', 'https://placehold.co/300x200/E6C073/556B2F?text=Set+de+Sábanas'),
        ('Walmart', 'https://walmart.com', 'Cafetera Nespresso', 'Con lechera integrada', 1, 199.99, 'Aún disponible', NULL, '', 'https://placehold.co/300x200/E6C073/556B2F?text=Cafetera+Nespresso'),
        ('Linio', 'https://linio.com', 'Vajilla para 6 personas', 'Porcelana blanca con detalles dorados', 1, 125.75, 'Aún disponible', NULL, '', 'https://placehold.co/300x200/E6C073/556B2F?text=Vajilla'),
        ('Tienda departamental', '', 'Plancha a vapor', 'Con función vertical', 1, 65.25, 'Aún disponible', NULL, '', 'https://placehold.co/300x200/E6C073/556B2F?text=Plancha+a+Vapor'),
        ('Etsy', 'https://etsy.com', 'Cuadro personalizado', 'Retrato de la pareja en acuarela', 1, 78.50, 'Ya fue comprado', '2024-01-12T14:22:00', 'Carlos', 'https://placehold.co/300x200/E6C073/556B2F?text=Cuadro+Personalizado')
      `;
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};