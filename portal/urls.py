from django.urls import path

from . import views

app_name = 'portal'

urlpatterns = [
    path('', views.home, name='home'),
    path('dashboard/', views.dashboard_page, name='dashboard'),
    path('api/dashboard/', views.dashboard_api, name='dashboard_api'),
    path('api/informe-pdf/', views.generated_report_pdf, name='generated_report_pdf'),
    path('hallazgos/', views.findings_page, name='findings'),
    path('metodologia/', views.methodology_page, name='methodology'),
    path('informe/', views.report_page, name='report'),
    path('territorio/', views.territory_page, name='territory'),
    path('mapa/', views.map_page, name='map'),
    path('api/chat/', views.chat, name='chat'),
    path('api/mapa/', views.map_api, name='map_api'),
    path('qr-proyecto.png', views.project_qr, name='project_qr'),
    path('documentos/<slug:slug>/', views.document_detail, name='document_detail'),
    path('documentos/<slug:slug>/pdf/', views.document_pdf, name='document_pdf'),
    path('media/<path:file_path>', views.serve_document_file, name='document_file'),
]