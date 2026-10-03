from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from portal.models import Document


REPOSITORY_DOCUMENTS = (
    {
        'slug': 'documentacion-del-proyecto',
        'title': 'DOCUMENTACION DEL PROYECTO',
        'document_type': 'word',
        'summary': 'Documento metodológico del proyecto sobre lesiones personales en Colombia.',
        'file': 'Documetacion_lesiones_personales.docx',
        'pdf_file': 'Documetacion_lesiones_personales.pdf',
    },
    {
        'slug': 'lesiones-personales-en-colombia-20212025',
        'title': 'Lesiones personales en Colombia 2021-2025',
        'document_type': 'excel',
        'summary': 'Base de datos del proyecto con información de lesiones personales en Colombia entre 2021 y 2025.',
        'file': 'lesiones_personales_0 (1) (1).xlsx',
    },
    {
        'slug': 'presentacion-del-proyecto-de-lesiones-personales',
        'title': 'Presentación del proyecto de lesiones personales',
        'document_type': 'powerpoint',
        'summary': 'Presentación general del proyecto de lesiones personales en Colombia.',
        'file': 'Presentacion De Proyecto.pptx',
    },
)


class Command(BaseCommand):
    help = 'Copia al almacenamiento del servicio los documentos versionados en el repositorio y los publica.'

    def handle(self, *args, **options):
        source_root = settings.BASE_DIR / 'documentos'
        for definition in REPOSITORY_DOCUMENTS:
            source_path = source_root / definition['file']
            if not source_path.is_file():
                raise CommandError(f'No se encontró el documento versionado: {source_path.name}')

            storage_name = f"documents/repository/{definition['file']}"
            if not default_storage.exists(storage_name):
                with source_path.open('rb') as source:
                    default_storage.save(storage_name, File(source, name=source_path.name))

            defaults = {
                'title': definition['title'],
                'document_type': definition['document_type'],
                'summary': definition['summary'],
                'file': storage_name,
                'is_published': True,
            }
            pdf_source = definition.get('pdf_file')
            if pdf_source:
                pdf_path = source_root / pdf_source
                if not pdf_path.is_file():
                    raise CommandError(f'No se encontró el PDF versionado: {pdf_path.name}')
                pdf_storage_name = f'documents/repository/{pdf_source}'
                if not default_storage.exists(pdf_storage_name):
                    with pdf_path.open('rb') as source:
                        default_storage.save(pdf_storage_name, File(source, name=pdf_path.name))
                defaults['pdf_file'] = pdf_storage_name

            document, created = Document.objects.update_or_create(
                slug=definition['slug'],
                defaults=defaults,
            )
            action = 'creado' if created else 'sincronizado'
            self.stdout.write(self.style.SUCCESS(f'Documento {document.slug} {action}.'))
