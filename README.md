# Fiesta Mágica - Invitación de Cumpleaños

Este proyecto es una aplicación web interactiva diseñada para gestionar las invitaciones y el registro de invitados para el primer cumpleaños de **Ashly Sofia Vanegas Silva**.

## ✨ Características

- **Diseño Personalizado:** Interfaz elegante con tipografía fluida y fondo fotográfico adaptativo.
- **Registro de Invitados:** Formulario para que los invitados confirmen su asistencia, número de acompañantes y datos de contacto.
- **Validación en Tiempo Real:** Generación de códigos únicos de verificación al completar el registro.
- **Panel de Administración:** Sección protegida para gestionar la lista de invitados y configuraciones del evento.
- **Base de Datos en Tiempo Real:** Integración con Firebase Firestore para almacenamiento instantáneo.

## 🚀 Tecnologías

- **Frontend:** React + Vite + TypeScript
- **Estilos:** Tailwind CSS v4
- **Animaciones:** Motion (Framer Motion)
- **Backend:** Firebase v12 (Authentication & Firestore)
- **Iconos:** Lucide React

## 📋 Requisitos Previos

- **Node.js** versión 18 o superior
- **npm** versión 9 o superior (incluido con Node.js)
- Un proyecto de **Firebase** con:
  - Authentication (Google Sign-In habilitado)
  - Firestore Database
  - Una colección llamada `guests`
  - Una colección llamada `config` con un documento `general`
  - Una colección llamada `admins`

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd fiestaasly-1
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase
Crea un archivo `.env` en la raíz del proyecto con las credenciales de tu proyecto Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=tu_database_id
```

Opcionalmente, copia el archivo de configuración:
```bash
cp .env.example .env
```

### 4. Configurar reglas de Firestore
En la consola de Firebase, ve a Firestore > Reglas y pega el contenido de `firestore.rules`.

### 5. Inicializar la base de datos
En Firestore, crea manualmente:
- Colección `guests`
- Colección `config` con documento `general`:
  ```json
  {
    "totalSpots": 50,
    "eventName": "Mi Primer Cumpleaños Ashly Sofia Vanegas Silva",
    "eventDate": "2024-06-15",
    "registrationOpen": true
  }
  ```
- Colección `admins` con documento usando el UID de tu cuenta Google

### 6. Agregar la imagen de fondo
Coloca una imagen llamada `fotoashly.webp` en la carpeta `public/` del proyecto.

## 🚀 Scripts Disponibles

```bash
# Desarrollo (inicia en http://localhost:3000)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Verificación de tipos TypeScript
npm run lint

# Limpiar carpeta dist
npm run clean
```

## 🔐 Guía del Administrador

Para acceder a los datos guardados y gestionar el evento:

1.  Abre la aplicación.
2.  Haz clic en el botón **"ENTRAR"** situado en la esquina superior derecha.
3.  Inicia sesión con tu cuenta de Google autorizada.
4.  Una vez iniciada la sesión, aparecerá la opción **"ADMINISTRAR"** en el menú superior.
5.  Desde el panel podrás:
    - Ver la lista completa de invitados con sus códigos de verificación.
    - Realizar check-in de invitados.
    - Modificar la configuración del evento (nombre, fecha, cupos).

## 📁 Estructura del Proyecto

```
fiestaasly-1/
├── public/
│   └── fotoashly.webp        # Imagen de fondo
├── src/
│   ├── App.tsx               # Lógica principal, componentes y vistas
│   ├── index.css             # Estilos globales y Tailwind
│   ├── lib/
│   │   └── firebase.ts       # Configuración de Firebase
│   └── main.tsx              # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example              # Plantilla de variables de entorno
├── firestore.rules           # Reglas de seguridad de Firestore
├── firebase-applet-config.json  # Configuración Firebase (para desarrollo)
└── README.md
```

## 🐛 Solución de Problemas

### Error de Firebase connection
Verifica que el archivo `.env` existe y tiene las credenciales correctas.

### Error de tipos TypeScript
```bash
npm run lint
```

### Limpiar caché de node_modules
```bash
rm -rf node_modules package-lock.json
npm install
```

---
Hecho con amor para un día especial ✨