from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import models
from pathlib import Path

from .utils import get_document_summary


def resolve_storage_path(file_field):
	if not file_field:
		return None
	name = str(file_field.name or '').strip().replace('\\', '/')
	if not name:
		return None
	candidates = []
	if name.startswith('/'):
		candidates.append(Path(name))
	else:
		candidates.append(Path(settings.MEDIA_ROOT) / name)
		candidates.append(Path(settings.BASE_DIR) / 'documentos' / name)
		if name.startswith('documents/'):
			candidates.append(Path(settings.BASE_DIR) / 'documentos' / name.split('documents/', 1)[1])
		candidates.append(Path(settings.BASE_DIR) / 'documentos' / Path(name).name)
		candidates.append(Path(settings.BASE_DIR) / name)
	for candidate in candidates:
		if candidate.exists():
			return candidate
	return Path(settings.MEDIA_ROOT) / name


def validate_uploaded_file(file_field, field_name):
	if not file_field:
		return
	allowed_extensions = {'.docx', '.xlsx', '.pptx', '.pdf'}
	name = str(file_field.name or '').lower()
	if not any(name.endswith(ext) for ext in allowed_extensions):
		raise ValidationError({field_name: 'El archivo debe ser un Word (.docx), Excel (.xlsx), PowerPoint (.pptx) o PDF.'})
	max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)
	if getattr(file_field, 'size', 0) > max_size:
		max_size_mb = max_size / (1024 * 1024)
		raise ValidationError({field_name: f'El archivo supera el tamaño máximo permitido ({max_size_mb:.0f} MB).'})


class Document(models.Model):
	DOCUMENT_TYPES = [
		('word', 'Documento Word'),
		('excel', 'Libro Excel'),
		('powerpoint', 'Presentación PowerPoint'),
	]

	title = models.CharField('título', max_length=140)
	slug = models.SlugField('identificador', unique=True)
	document_type = models.CharField('tipo', max_length=20, choices=DOCUMENT_TYPES)
	summary = models.TextField('resumen')
	file = models.FileField('archivo', upload_to='documents/')
	pdf_file = models.FileField('versión PDF para lectura', upload_to='documents/pdf/', blank=True)
	is_published = models.BooleanField('publicado', default=True)
	created_at = models.DateTimeField('fecha de carga', auto_now_add=True)

	class Meta:
		ordering = ['document_type', 'title']
		verbose_name = 'documento'
		verbose_name_plural = 'documentos'

	def clean(self):
		super().clean()
		if self.file:
			validate_uploaded_file(self.file, 'file')
		if self.pdf_file:
			name = str(self.pdf_file.name or '').lower()
			if not name.endswith('.pdf'):
				raise ValidationError({'pdf_file': 'La versión PDF debe ser un archivo .pdf.'})
			max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)
			if getattr(self.pdf_file, 'size', 0) > max_size:
				max_size_mb = max_size / (1024 * 1024)
				raise ValidationError({'pdf_file': f'La versión PDF supera el tamaño máximo permitido ({max_size_mb:.0f} MB).'} )

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)

	def __str__(self):
		return self.title

	@property
	def type_label(self):
		return dict(self.DOCUMENT_TYPES)[self.document_type]

	@property
	def curated_summary(self):
		return get_document_summary(self)

	@property
	def file_path(self):
		return resolve_storage_path(self.file)

	@property
	def pdf_path(self):
		return resolve_storage_path(self.pdf_file)

	@property
	def file_size_label(self):
		file_path = self.file_path
		if not file_path or not file_path.exists():
			return 'Tamaño no disponible'
		size = file_path.stat().st_size
		if size >= 1024 * 1024:
			return f'{size / (1024 * 1024):.1f} MB'
		return f'{max(size / 1024, 1):.0f} KB'

	@property
	def pdf_url(self):
		if self.pdf_file:
			return self.pdf_file.url
		if not self.file:
			return ''
		pdf_name = f'documents/pdf/{Path(self.file.name).stem}.pdf'
		if resolve_storage_path(self.file) and resolve_storage_path(self.file).suffix.lower() == '.pdf':
			return self.file.url
		return default_storage.url(pdf_name) if default_storage.exists(pdf_name) else ''
