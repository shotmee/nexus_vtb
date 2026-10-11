# Деплой стенда для жюри

Проверено локально 09.10.2026: `docker compose -f docker-compose.prod.yml up -d --build` поднимает сайт, API и живой поток сценариев (SSE) за nginx.

## Что нужно
- VPS у российского провайдера (Selectel, Timeweb Cloud, Yandex Cloud, VK Cloud): **2 vCPU, 4 ГБ RAM, 20 ГБ диска**, Ubuntu 22.04/24.04.
  С распознаванием скриншотов (`WITH_OCR=1`) — 4 ГБ RAM минимум и ещё ~2 ГБ диска.
- Домен — по желанию (без него сайт работает по IP на порту 80).

## Шаги

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Код — ровно тот тег, который сдаём (менять стенд после дедлайна нельзя, п. 5.9.2 Правил)
git clone https://github.com/ariasokuss/nexus_start_for_vtb.git vtb && cd vtb
git checkout sprint-1          # или нужная ветка, пока тега нет

# 3. Настройки
cp .env.example .env
# по желанию: LLM_PROVIDER=gigachat и GIGACHAT_CREDENTIALS=<ключ> — объяснения Щита от российской модели
# без LLM всё работает на шаблонах

# 4. Запуск
docker compose -f docker-compose.prod.yml up -d --build

# 5. Проверка
curl http://localhost/api/health            # {"status":"ok"}
```

Сайт: `http://<IP сервера>/`. Другой порт: `PORT=8080 docker compose -f docker-compose.prod.yml up -d`.

## HTTPS (если есть домен)
Самый простой путь — Caddy перед стендом, он сам получит сертификат:

```bash
PORT=8080 docker compose -f docker-compose.prod.yml up -d --build
sudo apt install -y caddy
echo 'start.example.ru { reverse_proxy localhost:8080 }' | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Обслуживание
- Логи: `docker compose -f docker-compose.prod.yml logs -f backend`
- Обновить: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- Состояние банка (операции, XP, цели) хранится в PostgreSQL и переживает перезапуск; шаг сценария — только в памяти. Чтобы вернуть демо к исходному состоянию, нажмите «сначала» в кабинете (сброс одного аккаунта).
- Один процесс бэкенда (`--workers 1`) — намеренно: аккаунты держатся в памяти процесса и сохраняются в PostgreSQL после каждого изменения (`backend/app/services/store.py`), шаг сценария и SSE — только в памяти. Перезапуск не теряет операции и XP.

## Перед сдачей
- [ ] Стенд открывается по ссылке в режиме инкогнито, с телефона тоже
- [ ] Все 5 сценариев проходят до конца
- [ ] На сервере — тот же коммит, что в теге `sprint-1`
- [ ] Стенд не трогаем после дедлайна до конца оценки
