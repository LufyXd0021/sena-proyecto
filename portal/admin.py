from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
	list_display = ('title', 'document_type', 'is_published', 'created_at')
	list_filter = ('document_type', 'is_published')
	prepopulated_fields = {'slug': ('title',)}
	search_fields = ('title', 'summary')
	fieldsets = (
		(None, {'fields': ('title', 'slug', 'document_type', 'summary', 'file', 'pdf_file', 'is_published')}),
		('Información', {'fields': ('created_at',), 'classes': ('collapse',)}),
	)
	readonly_fields = ('created_at',)

	def get_form(self, request, obj=None, **kwargs):
		form = super().get_form(request, obj, **kwargs)
		form.base_fields['title'].help_text = 'Nombre visible del recurso en la portada.'
		form.base_fields['slug'].help_text = 'Identificador único usado en la URL pública.'
		return form
