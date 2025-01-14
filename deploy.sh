docker compose down
docker system prune -a -f
git pull
docker compose up -d --build