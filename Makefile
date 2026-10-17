.PHONY: install dev test lint format backend frontend clean

install:
	cd backend && pip install -r requirements/dev.txt
	cd frontend && npm install

dev:
	@echo "Starting backend..."
	cd backend && python manage.py runserver &
	@echo "Starting frontend..."
	cd frontend && npm run dev

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

test:
	cd backend && python -m pytest --cov=apps --cov-report=term-missing

test-watch:
	cd backend && python -m pytest --cov=apps -f

lint:
	cd backend && flake8 apps/ tests/
	cd frontend && npm run lint

format:
	cd backend && black apps/ tests/ && isort apps/ tests/
	cd frontend && npm run format

migrate:
	cd backend && python manage.py migrate

shell:
	cd backend && python manage.py shell

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	cd frontend && rm -rf dist node_modules/.cache
