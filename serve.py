"""Servidor Windows para compartir el portal con varios dispositivos."""

import os

from waitress import serve

from config.wsgi import application


if __name__ == '__main__':
	port = int(os.environ.get('PORT', os.environ.get('DJANGO_SERVER_PORT', '8000')))
	threads = int(os.environ.get('DJANGO_SERVER_THREADS', '8'))
	channel_timeout = int(os.environ.get('DJANGO_SERVER_TIMEOUT', '120'))
	serve(application, host='0.0.0.0', port=port, threads=threads, channel_timeout=channel_timeout)