"""Genera el resumen JSON que usan el dashboard y el mapa."""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django

django.setup()

from portal.models import Document, resolve_storage_path
from portal.views import _dashboard_cache, _enrich_dashboard_data, _extract_excel_dashboard


def main():
	for document in Document.objects.filter(document_type__in=['excel', 'xlsx'], is_published=True):
		file_path = resolve_storage_path(document.file)
		if not file_path or not file_path.exists():
			continue
		data = _enrich_dashboard_data(_extract_excel_dashboard(document))
		cache_file = file_path.with_suffix('.dashboard.json')
		cache_file.write_text(json.dumps({'_source_mtime': file_path.stat().st_mtime_ns, 'data': data}, ensure_ascii=False), encoding='utf-8')
		_dashboard_cache.clear()
		print(f'Resumen generado: {cache_file}')


if __name__ == '__main__':
	main()