import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crea o actualiza el administrador usando variables de entorno.'

    def handle(self, *args, **options):
        username = os.environ.get('DJANGO_ADMIN_USERNAME', '').strip()
        password = os.environ.get('DJANGO_ADMIN_PASSWORD', '')
        email = os.environ.get('DJANGO_ADMIN_EMAIL', '').strip()

        if not username or not password:
            self.stdout.write('Administrador automático omitido: faltan DJANGO_ADMIN_USERNAME o DJANGO_ADMIN_PASSWORD.')
            return

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={'email': email},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = 'creado' if created else 'actualizado'
        self.stdout.write(self.style.SUCCESS(f'Administrador {username} {action} correctamente.'))
