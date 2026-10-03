# Observatorio de lesiones personales

Base Django para presentar el proyecto **Identificación, cuantificación y visualización de patrones temporales, demográficos y territoriales de lesiones personales en Colombia (2021-2025)**.

## Puesta en marcha

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Abre `http://127.0.0.1:8000/` para la página pública y `http://127.0.0.1:8000/admin/` para cargar documentos.

## Comandos de entorno (Windows / PowerShell)

```powershell
# Eliminar el entorno virtual para recrearlo desde cero
Remove-Item -Recurse -Force .venv

# Ver las versiones de Python instaladas
py --list

# Crear un nuevo entorno virtual con Python 3.13
py -3.13 -m venv .venv

# Permitir scripts locales (solo la primera vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Activar el entorno virtual
.\.venv\Scripts\Activate.ps1

# Instalar dependencias
python -m pip install -r requirements.txt

# Iniciar el servidor solo en este equipo
python manage.py runserver 127.0.0.1:8000

# Iniciar el servidor accesible desde otros dispositivos en la red local
python manage.py runserver 0.0.0.0:8000
```

El segundo comando es el que debes usar para probar el QR desde un celular.
Después de cambiar el comando, recarga la página para que se genere un QR nuevo.

## Servidor estable para varios dispositivos

Para una demostración con varios celulares o computadores, instala las dependencias y usa Waitress en lugar de `runserver`:

```powershell
python -m pip install -r requirements.txt
python manage.py collectstatic --noinput
python serve.py
```

Waitress mantiene varias solicitudes simultáneas mediante ocho hilos. El servidor queda disponible en `http://IP-DEL-EQUIPO:8000/`.
Reserva la IP del computador en el router y permite el puerto 8000 en el Firewall de Windows para que el QR no cambie ni quede bloqueado.

Puedes ajustar el servidor en `.env` sin modificar el código:

```env
DJANGO_SERVER_PORT=8000
DJANGO_SERVER_THREADS=8
DJANGO_SERVER_TIMEOUT=120
```

## Compartir el proyecto por QR en la red local

Para que un celular u otro computador pueda abrir el QR, inicia Django escuchando en todas las interfaces:

```powershell
python manage.py runserver 0.0.0.0:8000
```

El QR detecta automáticamente la IP Wi-Fi del computador. Si tienes varias redes activas o una VPN, fija la dirección exacta con `PROJECT_PUBLIC_URL` y agrégala a los hosts permitidos:

```powershell
$env:PROJECT_PUBLIC_URL = "http://192.168.1.25:8000"
$env:DJANGO_ALLOWED_HOSTS = "localhost,127.0.0.1,192.168.1.25"
python manage.py runserver 0.0.0.0:8000
```

El teléfono y el computador deben estar en la misma red Wi-Fi, y el Firewall de Windows debe permitir el puerto 8000.

Si Windows bloquea el acceso, abre PowerShell como administrador y ejecuta una sola vez:

```powershell
New-NetFirewallRule -DisplayName "Django puerto 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

En desarrollo no guardes una IP Wi-Fi en `.env` salvo que sea reservada; así el QR se adapta si cambia la red.

## PostgreSQL para varios usuarios

SQLite se mantiene como opción local. Para una instalación con varios dispositivos y usuarios, instala PostgreSQL, crea una base llamada `lesiones` y activa en `.env`:

```env
DJANGO_DB_ENGINE=postgresql
POSTGRES_DB=lesiones
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu-clave
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_CONN_MAX_AGE=60
```

Después ejecuta:

```powershell
python manage.py migrate
python manage.py collectstatic --noinput
python serve.py
```

No se debe cambiar a PostgreSQL hasta tener el servicio instalado y la base creada; mientras tanto, SQLite continúa funcionando sin cambios.

## Caché compartida con Redis

Para varios usuarios o varias instancias del servidor, instala Redis y activa en `.env`:

```env
DJANGO_CACHE_BACKEND=redis
REDIS_URL=redis://127.0.0.1:6379/1
```

WhiteNoise ya sirve los archivos estáticos comprimidos con nombres versionados. En una instalación pública puedes colocar Nginx delante de Waitress como proxy inverso.

## Actualizar los datos precalculados

Cuando reemplaces el Excel publicado, genera el resumen antes de iniciar el servidor:

```powershell
python tools/prepare_dashboard_cache.py
python manage.py collectstatic --noinput
python serve.py
```

El dashboard y el mapa leen ese archivo JSON preparado; no abren ni recorren el Excel durante las solicitudes de los usuarios.

También puedes guardar esos valores en el archivo `.env` (copia `.env.example` como `.env`) para no tener que escribirlos cada vez.

## Instalar en otro computador

Con Python 3.13 instalado, ejecuta:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Cargar los documentos

En el administrador, crea tres registros en **Documentos**:

- **Documento Word**: informe o documento metodológico.
- **Libro Excel**: base de datos y tablas de análisis.
- **Presentación PowerPoint**: presentación general del proyecto.

Cada registro necesita título, identificador, tipo, resumen y archivo. Al marcarlo como publicado aparecerá automáticamente en la sección **Documentos del proyecto**.

Para conservar exactamente el diseño de un informe, carga también su PDF en **Versión PDF para lectura**. La página priorizará ese PDF original sobre la conversión automática y mantendrá sus gráficos, imágenes, tablas y paginación.

## Asistente de preguntas frecuentes

El botón **Pregúntale al proyecto** aparece en todas las páginas. Ofrece un banco de preguntas y respuestas organizado en tres categorías — Dashboard, Documentación y Presentación — construido con los datos reales del Excel publicado. No requiere conexión a servicios externos ni claves de API.

## Configuración de producción

Usa [`.env.production.example`](.env.production.example) como plantilla y copia sus valores a `.env` en el servidor. No publiques ese archivo ni sus contraseñas:

```
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=una-clave-larga-y-aleatoria
DJANGO_ALLOWED_HOSTS=tu-dominio.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://tu-dominio.com
DJANGO_SECURE_SSL_REDIRECT=True
```

En producción, Waitress debe escuchar solo detrás de un proxy HTTPS como Caddy, Nginx o IIS. El proxy recibe el tráfico en `443`, gestiona el certificado TLS y reenvía internamente a Waitress en `127.0.0.1:8000`. No abras el puerto 8000 a Internet ni uses `runserver` para producción.

Flujo recomendado:

```powershell
python manage.py check --deploy
python manage.py migrate
python tools\prepare_dashboard_cache.py
python manage.py collectstatic --noinput
python serve.py
```

El puerto 8000 debe quedar accesible solo desde el propio servidor o la red privada; el firewall y el proxy deben ser los únicos puntos expuestos públicamente.

## Desplegar una demostración en Render

El archivo `render.yaml` permite crear el servicio web y la base PostgreSQL desde Render:

1. Sube este repositorio a GitHub y entra a [Render](https://render.com/).
2. Selecciona **New + → Blueprint**, conecta tu cuenta de GitHub y elige este repositorio.
3. Confirma la creación de los recursos definidos en `render.yaml`. Render generará `DJANGO_SECRET_KEY` y conectará la base de datos.
4. Cuando el despliegue termine, abre la URL `onrender.com` asignada al servicio.

Esta configuración usa los planes gratuitos para demostraciones: el servicio puede suspenderse cuando no recibe tráfico y la base de datos gratuita tiene fecha de expiración. Los archivos subidos a `media/` no tienen almacenamiento persistente en esta configuración y pueden perderse al reiniciar o redesplegar. No la uses para información real ni para conservar datos importantes; para producción configura recursos persistentes y almacenamiento de archivos adecuado.

Render termina HTTPS en su proxy y redirige allí las solicitudes HTTP. Por eso el Blueprint desactiva la redirección SSL duplicada de Django, que puede causar un bucle detrás del proxy.
