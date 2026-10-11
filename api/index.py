import os
import sys
from pathlib import Path

# Add project root directory to sys.path so backend and routing_core can be imported
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

from django.core.wsgi import get_wsgi_application

# Vercel Serverless Python looks for an exported 'app' or 'handler' callable
app = get_wsgi_application()
handler = app
