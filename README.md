# microservice-github
Microservice that connects github information with the Smart Contract of the Network

# Local Dev
## Start postgresdb on docker

First time
```bash
docker run -d --name github-db -p 54320:5432 -e POSTGRES_PASSWORD=github -e POSTGRES_DB=github -e POSTGRES_USER=github postgres:13
```
After that
```bash
docker start github-db
```

## Install nodemon (if needed)
```bash
npm install -g nodemon
```

## Run microservice
Copy .env.example to .env
```bash
cp .env.example .env
```
and fill the missing settings
Then:
```bash
npm start
```
Check if it's working at: http://localhost:3005/
