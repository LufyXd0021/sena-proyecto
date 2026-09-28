from __future__ import annotations

from .utils import dashboard_number as _dashboard_number, dashboard_display as _dashboard_display


def get_question_bank():
    from .views import dashboard_preview_data

    statistics = dashboard_preview_data()
    annual = statistics.get('annual', [])
    regions = statistics.get('regions', [])
    gender = statistics.get('gender', [])
    ages = statistics.get('ages', [])
    peak = max(annual, key=lambda item: _dashboard_number(item.get('value')), default={'label': '2022', 'value': '110.410'})
    top_region = max(regions, key=lambda item: _dashboard_number(item.get('value')), default={'label': 'REGION ANDINA', 'value': '315.074'})
    top_age = max(ages, key=lambda item: _dashboard_number(item.get('value')), default={'label': 'ADULTOS', 'value': '455.211'})
    top_gender = max(gender, key=lambda item: _dashboard_number(item.get('value')), default={'label': 'MASCULINO', 'value': '298.881'})

    return {
        'dashboard': {
            'label': 'Cifras y Dashboard',
            'description': 'Cifras oficiales, víctimas vs. casos y hallazgos visuales.',
            'questions': [
                {'id': 'dashboard-overview', 'label': '¿Qué analiza el dashboard?', 'answer': 'El dashboard organiza la información de lesiones personales en tres dimensiones: tiempo (2021-2025), población (género, edad y armas) y territorio (regiones y municipios). Permite cruzar variables y comprender el comportamiento del fenómeno en Colombia.'},
                {'id': 'dashboard-cases-vs-victims', 'label': '¿Cuál es la diferencia entre casos y víctimas?', 'answer': 'El observatorio distingue dos métricas clave: los casos o hechos delictivos (332.390 eventos registrados) y las víctimas (495.272 personas lesionadas en las tablas operativas). En promedio, cada caso registrado involucra a 1,49 víctimas.'},
                {'id': 'dashboard-peak', 'label': '¿Qué año presenta el valor más alto y cuál es la tendencia?', 'answer': f"El año con mayor afectación fue {peak.get('label')}, con {peak.get('value')} víctimas registradas. A partir de 2022 se observa una disminución sostenida hasta 2025 (89.714 víctimas), equivalente a una reducción del -18,7% respecto al pico histórico."},
                {'id': 'dashboard-region', 'label': '¿Qué región concentra más registros?', 'answer': f"La Región Andina concentra el mayor volumen con {top_region.get('value')} registros agregados (63,6% del total nacional), seguida por la Región Caribe (15,3%) y la Región Pacífica (14,8%)."},
                {'id': 'dashboard-weapons', 'label': '¿Cuáles son los medios y armas más empleados?', 'answer': 'Los elementos contundentes (44,4% / 220.082 víctimas) y las agresiones sin empleo de armas (39,0% / 193.159 víctimas) representan el 83,4% de los hechos, evidenciando el predominio de riñas interpersonales. Las armas blancas alcanzan el 10,6% y las de fuego el 4,2%.'},
                {'id': 'dashboard-days', 'label': '¿Qué días de la semana son los más críticos?', 'answer': 'El domingo es el día con mayor afectación, concentrando 119.048 víctimas (24,0%), seguido del sábado con 81.434 (16,4%). El fin de semana acumula el 40,4% de todas las lesiones registradas.'},
            ],
        },
        'documentation': {
            'label': 'Documentación y Metodología',
            'description': 'Metodología, fuentes institucionales y fuentes de datos.',
            'questions': [
                {'id': 'documentation-purpose', 'label': '¿Cuál es el propósito del proyecto?', 'answer': 'Identificar, cuantificar y visualizar patrones temporales, demográficos y territoriales de lesiones personales en Colombia entre 2021 y 2025 para aportar evidencia a la política pública de seguridad y convivencia ciudadana.'},
                {'id': 'documentation-method', 'label': '¿Qué metodología utiliza?', 'answer': 'La documentación integra, depura y explora microdatos oficiales para construir indicadores comparables. Aplica análisis temporal, poblacional y territorial con trazabilidad metodológica completa.'},
                {'id': 'documentation-results', 'label': '¿Cuáles son las cifras principales del informe?', 'answer': 'El informe documenta 332.390 casos delictivos consolidados y 495.272 víctimas acumuladas entre 2021 y 2025. El dashboard interactivo permite explorar la serie anual y los cortes temáticos.'},
                {'id': 'documentation-source', 'label': '¿Cuál es la fuente institucional?', 'answer': 'La fuente institucional oficial es el Sistema de Información Estadístico, Delincuencial, Contravencional y Operativo (SIEDCO) de la Policía Nacional de Colombia, con cobertura en más de 1.020 municipios.'},
                {'id': 'documentation-resource', 'label': '¿Qué documentos están publicados?', 'answer': 'Están publicados tres recursos principales: el documento analítico en Word y PDF de lectura, el libro Excel con los datos operativos del dashboard, y la presentación general del proyecto.'},
            ],
        },
        'presentation': {
            'label': 'Presentación y Conclusiones',
            'description': 'Resumen ejecutivo, perfiles vulnerables y recomendaciones.',
            'questions': [
                {'id': 'presentation-findings', 'label': '¿Cuáles son los hallazgos para destacar?', 'answer': f"Destaca el pico anual en {peak.get('label')}, el descenso posterior de -18,7%, la concentración del 63,6% en la Región Andina, la predominancia de adultos (91,9%) y el hecho de que más del 83% de las agresiones provienen de riñas y golpes contundentes sin armas de fuego."},
                {'id': 'presentation-profile', 'label': '¿Cuál es el perfil demográfico predominante?', 'answer': f"El grupo más representado corresponde a {top_age.get('label', '').title()} con {top_age.get('value')} víctimas (91,9%). A nivel de género, los hombres representan el 60,3% ({top_gender.get('value')} víctimas) y las mujeres el 39,6% (196.115 víctimas)."},
                {'id': 'presentation-explain', 'label': '¿Cómo puedo explicar el proyecto?', 'answer': 'Puedes presentarlo como un observatorio que transforma microdatos policiales en una lectura clara de tendencias, perfiles y territorios para orientar conversaciones de prevención, seguridad y justicia.'},
                {'id': 'presentation-audience', 'label': '¿Para quién es útil este observatorio?', 'answer': 'Para investigadores, equipos de formulación de política pública, autoridades policiales, periodistas y analistas que requieran evidencia trazable sobre violencia interpersonal en Colombia.'},
                {'id': 'presentation-use', 'label': '¿Cómo se usa el dashboard en una presentación?', 'answer': 'Inicia con la tendencia anual, aplica filtros por región o grupo de edad para evidenciar patrones específicos y contrasta la lectura con la metodología y la fuente institucional.'},
            ],
        },
    }


def get_chat_categories():
    bank = get_question_bank()
    return [{
        'id': key,
        'label': value['label'],
        'description': value['description'],
        'questions': [{'id': item['id'], 'label': item['label']} for item in value['questions']],
    } for key, value in bank.items()]


def get_quick_questions():
    return [
        {'id': 'dashboard-cases-vs-victims', 'category': 'dashboard', 'label': '¿Diferencia entre casos y víctimas?'},
        {'id': 'dashboard-overview', 'category': 'dashboard', 'label': '¿Qué analiza el dashboard?'},
        {'id': 'dashboard-peak', 'category': 'dashboard', 'label': '¿Año con más víctimas y tendencia?'},
        {'id': 'presentation-findings', 'category': 'presentation', 'label': '¿Cuáles son los hallazgos para destacar?'},
    ]


def build_homepage_summary(statistics):
    annual = statistics.get('annual', [])
    regions = statistics.get('regions', [])
    gender = statistics.get('gender', [])
    ages = statistics.get('ages', [])
    to_number = lambda value: float(str(value or '0').replace('.', '').replace(',', '.'))
    annual_values = [(item.get('label', ''), to_number(item.get('value'))) for item in annual]
    peak_year, peak_value = max(annual_values, key=lambda item: item[1], default=('-', 0))
    first_value = annual_values[0][1] if annual_values else 0
    last_value = annual_values[-1][1] if annual_values else 0
    change = ((last_value - first_value) / first_value * 100) if first_value else 0
    peak_reduction = ((last_value - peak_value) / peak_value * 100) if peak_value else 0

    total_victims = sum(val for _, val in annual_values)
    top_region_item = max(regions, key=lambda item: to_number(item.get('value')), default={'label': 'Sin datos', 'value': '0'})
    top_region_num = to_number(top_region_item.get('value'))
    top_region_share = f'{(top_region_num / total_victims * 100):.1f}%'.replace('.', ',') if total_victims else '0%'

    top_gender_item = max(gender, key=lambda item: to_number(item.get('value')), default={'label': 'Sin datos', 'value': '0'})
    top_gender_num = to_number(top_gender_item.get('value'))
    top_gender_share = f'{(top_gender_num / total_victims * 100):.1f}%'.replace('.', ',') if total_victims else '0%'

    top_age_item = max(ages, key=lambda item: to_number(item.get('value')), default={'label': 'Sin datos', 'value': '0'})
    top_age_num = to_number(top_age_item.get('value'))
    top_age_share = f'{(top_age_num / total_victims * 100):.1f}%'.replace('.', ',') if total_victims else '0%'

    chart_points = []
    if len(annual_values) >= 2:
        x_coords = [60, 160, 260, 360, 460]
        y_min, y_max = 75, 190
        max_val = max(v for _, v in annual_values)
        min_val = min(v for _, v in annual_values)
        span = (max_val - min_val) or 1
        for i, (yr, val) in enumerate(annual_values):
            x = x_coords[i] if i < len(x_coords) else int(round(60 + i * 100))
            y = int(round(y_max - ((val - min_val) / span) * (y_max - y_min)))
            label_y = int(y - 14)
            chart_points.append({
                'cx': int(x),
                'cy': int(y),
                'label_y': int(label_y),
                'year': yr,
                'value': _dashboard_display(val),
            })
    polyline_str = ' '.join(f"{p['cx']},{p['cy']}" for p in chart_points)

    return {
        'peak_year': peak_year,
        'peak_value': _dashboard_display(peak_value),
        'change': f'{change:+.1f}%'.replace('.', ','),
        'peak_reduction': f'{peak_reduction:+.1f}%'.replace('.', ','),
        'top_region': {
            'label': top_region_item.get('label', 'Sin datos'),
            'value': top_region_item.get('value', '0'),
            'share': top_region_share,
        },
        'top_gender': {
            'label': top_gender_item.get('label', 'Sin datos'),
            'value': top_gender_item.get('value', '0'),
            'share': top_gender_share,
        },
        'top_age': {
            'label': top_age_item.get('label', 'Sin datos'),
            'value': top_age_item.get('value', '0'),
            'share': top_age_share,
        },
        'region_count': len(regions),
        'total_victims': _dashboard_display(total_victims) if total_victims else '495.272',
        'total_cases': '332.390',
        'chart_points': chart_points,
        'chart_polyline': polyline_str,
    }


def get_answer_for_question(category_id: str, question_id: str):
    bank = get_question_bank()
    category_key = str(category_id or '')
    category = bank.get(category_key)
    if not category:
        return None
    question = next((item for item in category['questions'] if item['id'] == str(question_id)), None)
    return question['answer'] if question else None
