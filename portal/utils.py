"""Utilidades compartidas entre views.py y services.py."""
from __future__ import annotations


def dashboard_number(value) -> float:
	"""Convierte cualquier representación numérica del dashboard a float.

	Maneja formatos como '110.410', '1,5', '110.410,50', porcentajes y None.
	"""
	if value is None:
		return 0
	if isinstance(value, (int, float)):
		return float(value)
	text = str(value).strip()
	# Eliminar separadores de miles (punto) y convertir coma decimal a punto
	text = text.replace('.', '').replace(',', '.')
	text = text.replace('%', '').replace('$', '').replace(' ', '')
	try:
		return float(text)
	except ValueError:
		return 0


def dashboard_display(value) -> str:
	"""Formatea un número al estilo colombiano: separador de miles con punto.

	Ejemplos: 110410 → '110.410', 1.5 → '1,5'
	"""
	num = dashboard_number(value)
	if num != num:  # NaN guard
		return '0'
	if float(num).is_integer():
		return format(int(num), ',').replace(',', '.')
	return format(num, ',').replace(',', '.')


# Textos curados por tipo de documento.
# Están aquí y no en el modelo para mantener la capa de datos separada
# de los textos de presentación.
_CURATED_SUMMARIES: dict[str, str] = {
	'word': (
		'Informe de analítica de datos sobre 332.390 casos y 495.272 víctimas de lesiones '
		'personales en Colombia entre 2021 y 2025. Analiza tendencias anuales y mensuales, '
		'medios empleados y género, grupos de edad, días de la semana y distribución regional; '
		'incluye metodología, tablas, dashboard, estrategias de comunicación y conclusiones.'
	),
	'excel': (
		'Base de datos operativa del proyecto con registros organizados en hojas anuales y '
		'temáticas. Sirve como fuente tabular para calcular indicadores y visualizar patrones '
		'temporales, demográficos y territoriales de las lesiones personales.'
	),
}


def get_document_summary(document) -> str:
	"""Devuelve el resumen curado para un documento según su tipo.

	Si el tipo no tiene texto predefinido, devuelve el campo ``summary`` del modelo.
	"""
	return _CURATED_SUMMARIES.get(document.document_type) or document.summary
